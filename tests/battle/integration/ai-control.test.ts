import { beforeEach, afterEach, expect, test } from "bun:test";
import SuperJSON from "superjson";
import { eq } from "drizzle-orm";
import {
  MANUAL_CONTROL,
  type AiControl,
} from "../../../apps/game/src/ai-control";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import type { ActionPlan } from "../../../apps/server/src/battle/activation-plan";
import {
  journalSchema,
  reconstructBattle,
} from "../../../apps/server/src/battle/reconstruct-battle";
import { characterRouter } from "../../../apps/server/src/routers/character-router";
import {
  TB_battleStart,
  TB_character,
  TB_dungeonData,
  TB_dungeonParticipant,
  TB_dungeonEnemy,
} from "../../../apps/server/src/db/schema";
import { applyBattleCommand } from "../../../apps/server/src/battle/commands";
import { beginDungeonAttempt } from "../../../apps/server/src/game-usecases/dungeon-attempt";
import { deserializeStartingBuilds } from "../../../apps/server/src/battle/starting-build-codec";
import type { StartingBuilds } from "../../../apps/server/src/battle/starting-builds";
import { database, type TestDatabase } from "../support/database";
import { tacticalDurable, tacticalState } from "../support/tactical-durable";

const nativeFetch = globalThis.fetch;
type Request = {
  resolve: (response: Response) => void;
  signal: AbortSignal;
  body: { messages: { role: string; content: string }[] };
};
let requests: Request[];
let data: TestDatabase;
beforeEach(async () => {
  data = await database();
  requests = [];
  globalThis.fetch = ((_url, options) =>
    new Promise<Response>((resolve) => {
      requests.push({
        resolve,
        signal: options!.signal!,
        body: JSON.parse(options!.body as string),
      });
    })) as typeof fetch;
});
afterEach(async () => {
  globalThis.fetch = nativeFetch;
  await data.close();
});
const pass: ActionPlan = { destination: null, action: { type: "endTurn" } };
function respond(index: number, plan: ActionPlan = pass) {
  requests[index]!.resolve(
    Response.json({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(plan) } },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 30,
        total_tokens: 130,
        completion_tokens_details: { reasoning_tokens: 10 },
      },
    }),
  );
}
async function until(condition: () => boolean, timeout = 2000) {
  const end = Date.now() + timeout;
  while (!condition() && Date.now() < end)
    await new Promise((resolve) => setTimeout(resolve, 5));
  expect(condition()).toBe(true);
}
async function fixture(enabled = false) {
  return tacticalDurable(data.db, (builds, _grid, env) => {
    env.OPENROUTER_API_KEY = "test-placeholder";
    builds[0]!.aiControl = { ...MANUAL_CONTROL, enabled };
  });
}
async function control(
  f: Awaited<ReturnType<typeof fixture>>,
  settings: AiControl,
  owner = 0,
  entityId = "audit-hero",
) {
  await f.socket.webSocketMessage(
    f.sockets[owner]!,
    SuperJSON.stringify({
      type: "setAiControl",
      data: {
        entityId,
        settings,
        requestId: crypto.randomUUID(),
        controlVersion: f.socket.messages.length,
      },
    }),
  );
}

test("only the owner reads/edits saved defaults; new attempts freeze them independently", async () => {
  const owner = characterRouter.createCaller({
    session: { id: "audit-owner" },
    db: data.db,
  } as never);
  const stranger = characterRouter.createCaller({
    session: { id: "stranger" },
    db: data.db,
  } as never);
  expect(await owner.getAiControl({ characterId: "audit-hero" })).toEqual(
    MANUAL_CONTROL,
  );
  const settings = {
    enabled: true,
    prompt: "Run away",
    allowConsumables: false,
  };
  await expect(
    stranger.setAiControl({ characterId: "audit-hero", settings }),
  ).rejects.toThrow();
  await expect(
    stranger.getAiControl({ characterId: "audit-hero" }),
  ).rejects.toThrow();
  await owner.setAiControl({ characterId: "audit-hero", settings });
  expect(await owner.getAiControl({ characterId: "audit-hero" })).toEqual(
    settings,
  );
  const id = await beginDungeonAttempt("audit-dungeon", "audit-owner", data.db);
  await data.db
    .insert(TB_dungeonData)
    .values({
      id: "other-run",
      key: "dungeon1",
      createdBy: "audit-owner",
      characterData: [{ characterId: "audit-hero", health: 37, mana: 9 }],
    });
  await data.db
    .insert(TB_dungeonParticipant)
    .values({ dungeonId: "other-run", characterId: "audit-hero" });
  await data.db
    .insert(TB_dungeonEnemy)
    .values({
      id: "other-goblin",
      dungeonId: "other-run",
      type: "goblin",
      inRound: 0,
    });
  const otherId = await beginDungeonAttempt(
    "other-run",
    "audit-owner",
    data.db,
  );
  await owner.setAiControl({
    characterId: "audit-hero",
    settings: MANUAL_CONTROL,
  });
  const [saved] = await data.db
    .select()
    .from(TB_battleStart)
    .where(eq(TB_battleStart.battleId, id));
  const frozen = deserializeStartingBuilds(saved!.builds);
  expect(frozen[0]!.aiControl).toEqual(settings);
  const [otherSaved] = await data.db
    .select()
    .from(TB_battleStart)
    .where(eq(TB_battleStart.battleId, otherId));
  const otherFrozen = deserializeStartingBuilds(otherSaved!.builds);
  const restore = (battleId: string, builds: StartingBuilds) =>
    reconstructBattle(battleId, builds, [], {
      rulesVersion: 2,
      battlefield: { width: 9, height: 9, blocked: [], layoutVersion: "test" },
      positions: Object.fromEntries(
        builds.map((build, index) => [build.id, { x: index * 3, y: 0 }]),
      ),
    });
  const first = restore(id, frozen);
  const second = restore(otherId, otherFrozen);
  applyBattleCommand(
    first,
    {
      type: "setAiControl",
      data: {
        entityId: "audit-hero",
        requestId: "override",
        controlVersion: 0,
        settings: MANUAL_CONTROL,
      },
    },
    "audit-owner",
  );
  expect(first.entities[0]!.aiControl).toEqual(MANUAL_CONTROL);
  expect(second.entities[0]!.aiControl).toEqual(settings);
  expect(frozen[0]!.aiControl).toEqual(settings);
  expect((await data.db.select().from(TB_character))[0]!.aiEnabled).toBe(false);
});

test("enable after movement, private state, atomic pass and recovery without provider replay", async () => {
  const f = await fixture();
  await f.send(f.command({ type: "move", destination: { x: 1, y: 0 } }));
  await control(f, {
    enabled: true,
    prompt: "Stand still",
    allowConsumables: false,
  });
  await until(() => requests.length === 1);
  expect(
    JSON.parse(requests[0]!.body.messages[2]!.content).movementRemaining,
  ).toBe(2);
  expect(requests[0]!.body.messages[1]!.content).toBe("Stand still");
  expect(JSON.stringify(requests[0]!.body.messages)).not.toContain(
    "Help the acting side win",
  );
  expect(JSON.stringify(f.messages[1])).not.toContain("Stand still");
  expect(
    f.messages[0].some(
      (m) => m.type === "state" && m.data.ai?.choosing === "audit-hero",
    ),
  ).toBe(true);
  respond(0);
  await until(() => f.socket.bm.grid!.activation!.entityId === "guest-hero");
  expect(f.socket.messages).toHaveLength(3);
  const recovered = await f.rehydrate();
  expect(tacticalState(recovered.bm)).toEqual(tacticalState(f.socket.bm));
  expect(requests).toHaveLength(1);
  expect(recovered.bm.entities[0]!.aiControl?.prompt).toBe("Stand still");
});

test("takeover cancels a pending decision and ignores its late success; host cannot take over a teammate", async () => {
  const f = await fixture(true);
  await until(() => requests.length === 1);
  await control(f, MANUAL_CONTROL, 1);
  expect(f.socket.bm.entities[0]!.aiControl!.enabled).toBe(true);
  await control(f, MANUAL_CONTROL);
  expect(requests[0]!.signal.aborted).toBe(true);
  const before = tacticalState(f.socket.bm);
  respond(0);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(tacticalState(f.socket.bm)).toEqual(before);
  expect(f.socket.bm.entities[0]!.aiControl!.enabled).toBe(false);
  expect(f.socket.messages).toHaveLength(1);
});

test("prompt and permission edits replace requests; stale failures cannot disable the replacement", async () => {
  const f = await fixture(true);
  await until(() => requests.length === 1);
  await control(f, { enabled: true, prompt: "Wait", allowConsumables: false });
  await until(() => requests.length === 2);
  expect(requests[0]!.signal.aborted).toBe(true);
  requests[0]!.resolve(new Response("budget exhausted", { status: 402 }));
  expect(
    JSON.parse(requests[1]!.body.messages[2]!.content).allowConsumables,
  ).toBe(false);
  respond(1);
  await until(() => f.socket.bm.grid!.activation!.entityId === "guest-hero");
  expect(f.socket.bm.entities[0]!.aiControl!.enabled).toBe(true);
  expect(f.socket.bm.entities[0]!.aiFailure).toBeUndefined();
  expect(f.socket.messages).toHaveLength(2);
});

test.each(["illegal", "malformed", "budget", "unconfigured"])(
  "player failure (%s) leaves battle unchanged and persists manual control offline",
  async (kind) => {
    const f = await fixture();
    if (kind === "unconfigured") delete f.env.OPENROUTER_API_KEY;
    const before = tacticalState(f.socket.bm);
    await control(f, { ...MANUAL_CONTROL, enabled: true });
    // Socket presence is irrelevant to automatic progression or failure.
    f.socket.sessions.clear();
    if (kind !== "unconfigured") {
      await until(() => requests.length === 1);
      if (kind === "illegal")
        respond(0, {
          destination: { x: 1, y: 0 },
          action: { type: "consumable", slot: 1 },
        });
      else if (kind === "malformed")
        requests[0]!.resolve(
          Response.json({
            choices: [
              { finish_reason: "stop", message: { content: "not-json" } },
            ],
          }),
        );
      else
        requests[0]!.resolve(
          new Response("provider secret details", { status: 402 }),
        );
    }
    await until(() => f.socket.bm.entities[0]!.aiControl?.enabled === false);
    expect(tacticalState(f.socket.bm)).toEqual(before);
    expect(f.socket.bm.entities[0]!.aiFailure).toContain(
      "Manual control has resumed",
    );
    expect(f.socket.bm.entities[0]!.aiFailure).not.toContain("secret");
    const recovered = await f.rehydrate();
    expect(recovered.bm.entities[0]!.aiControl!.enabled).toBe(false);
    expect(recovered.bm.entities[0]!.aiFailure).toEqual(
      f.socket.bm.entities[0]!.aiFailure,
    );
  },
);

test("five-second deadline includes reading the complete response body", async () => {
  const f = await fixture(true);
  await until(() => requests.length === 1);
  requests[0]!.resolve(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"choices":'));
        },
      }),
    ),
  );
  await until(
    () => f.socket.bm.entities[0]!.aiControl?.enabled === false,
    6000,
  );
  expect(requests[0]!.signal.aborted).toBe(true);
  expect(f.socket.bm.entities[0]!.aiFailure).toContain("five seconds");
});

test("enemy class opt-in falls back from unchanged state and records actual selections", async () => {
  const f = await tacticalDurable(data.db, (builds, _grid, env) => {
    env.OPENROUTER_API_KEY = "test-placeholder";
    builds[2]!.aiControl = {
      enabled: true,
      prompt: "Charge",
      allowConsumables: true,
    };
  });
  await f.send(f.command({ type: "endTurn" }));
  await f.send(f.command({ type: "endTurn" }), 1);
  await until(() => requests.length === 1);
  requests[0]!.resolve(new Response("unavailable", { status: 503 }));
  await until(() => f.socket.bm.grid!.activation!.entityId === "audit-hero");
  const entry = journalSchema.parse(SuperJSON.parse(f.socket.messages.at(-1)!));
  expect(entry).toMatchObject({
    type: "aiAction",
    data: { source: "fallback" },
  });
  expect(tacticalState((await f.rehydrate()).bm)).toEqual(
    tacticalState(f.socket.bm),
  );
  expect(requests).toHaveLength(1);
  expect(f.socket.bm.entities[2]!.aiControl!.enabled).toBe(true);
});

test("storage failure never publishes the candidate; unresolved journal recovery makes no historical provider calls", async () => {
  const f = await fixture(true);
  await until(() => requests.length === 1);
  const before = tacticalState(f.socket.bm);
  f.setStorageFailure(true);
  respond(0);
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(tacticalState(f.socket.bm)).toEqual(before);
  expect(f.socket.messages).toHaveLength(0);
  const recovered = reconstructBattle(
    "audit-battle",
    f.storage.get("startingBuilds") as StartingBuilds,
    [],
    f.storage.get("startingGrid") as NonNullable<typeof f.socket.bm.grid>,
  );
  expect(tacticalState(recovered)).toEqual(before);
  f.setStorageFailure(false);
  await f.socket.alarm();
  await until(() => requests.length === 2);
  respond(1);
  await until(() => f.socket.bm.grid!.activation!.entityId === "guest-hero");
  expect(f.socket.messages).toHaveLength(1);
});

test("abandonment aborts pending work and rejects late responses", async () => {
  const f = await fixture(true);
  await until(() => requests.length === 1);
  const before = tacticalState(f.socket.bm);
  await f.socket.abandon("audit-dungeon", "audit-owner");
  expect(requests[0]!.signal.aborted).toBe(true);
  respond(0);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(tacticalState(f.socket.bm)).toEqual(before);
  expect(requests).toHaveLength(1);
});

test("an equipped consumable is spent once and recovery preserves its quantity", async () => {
  const f = await tacticalDurable(data.db, (builds, _grid, env) => {
    env.OPENROUTER_API_KEY = "test-placeholder";
    builds[0]!.aiControl = { ...MANUAL_CONTROL, enabled: true };
    builds[0]!.health = 40;
    builds[0]!.consumables = [
      {
        version: 1,
        slot: 0,
        type: "healing-potion",
        name: "Healing Potion",
        quantity: 1,
        restoration: { resource: "health", amount: 20 },
      },
    ];
  });
  await until(() => requests.length === 1);
  const health = f.socket.bm.entities[0]!.health;
  respond(0, {
    destination: { x: 1, y: 0 },
    action: { type: "consumable", slot: 0 },
  });
  await until(() => f.socket.bm.grid!.activation!.entityId === "guest-hero");
  expect(f.socket.bm.entities[0]!.health).toBe(health + 20);
  expect(f.socket.bm.entities[0]!.consumables![0]!.quantity).toBe(0);
  expect(tacticalState((await f.rehydrate()).bm)).toEqual(
    tacticalState(f.socket.bm),
  );
  expect(requests).toHaveLength(1);
});

test("consecutive AI actors finish and settle a battle with no connected owners", async () => {
  const f = await tacticalDurable(data.db, (builds, grid, env) => {
    env.OPENROUTER_API_KEY = "test-placeholder";
    builds.forEach((build) => {
      build.aiControl = { ...MANUAL_CONTROL, enabled: true };
    });
    builds[0]!.mana = builds[0]!.maxMana = 200;
    builds[0]!.spells = (["fleetfoot-gambit", "cinder-wisp"] as const).map(
      (type) => ({
        config: createSpellFromType(type, type).config,
        currentCooldown: 0,
      }),
    );
    builds[2]!.health = builds[2]!.maxHealth = 1;
    grid.positions["audit-goblin"] = { x: 1, y: 2 };
  });
  // Recovered sockets know that neither owner is connected.
  await f.disconnect(0);
  await f.disconnect(1);
  f.socket.sessions.clear();
  for (let index = 0; index < 6; index++) {
    await until(() => requests.length === index + 1);
    respond(
      index,
      index === 0
        ? {
            destination: null,
            action: {
              type: "cast",
              spellId: "fleetfoot-gambit",
              selection: { aim: "tile", tile: { x: 1, y: 1 } },
            },
          }
        : pass,
    );
  }
  await until(() => requests.length === 7);
  expect(
    requests.map(
      (request) => JSON.parse(request.body.messages[2]!.content).actorId,
    ),
  ).toEqual([
    "audit-hero",
    "guest-hero",
    "audit-goblin",
    "audit-hero",
    "guest-hero",
    "audit-goblin",
    "audit-hero",
  ]);
  const normal = JSON.parse(requests[3]!.body.messages[2]!.content);
  const extra = JSON.parse(requests[6]!.body.messages[2]!.content);
  expect(extra.round).toBe(normal.round);
  expect(extra.activation.id).not.toBe(normal.activation.id);
  expect(extra.movementRemaining).toBe(extra.activation.allowance);
  // A legal attack can miss. Continue real activations until one connects.
  let index = 6;
  for (; index < 15 && !f.socket.bm.isGameOver(); index++) {
    await until(() => requests.length === index + 1);
    const actor = f.socket.bm.grid!.activation!.entityId;
    respond(
      index,
      actor === "audit-hero"
        ? {
            destination: null,
            action: {
              type: "cast",
              spellId: "cinder-wisp",
              selection: { aim: "tile", tile: { x: 1, y: 2 } },
            },
          }
        : pass,
    );
    await until(
      () =>
        f.socket.bm.isGameOver() ||
        requests.length > index + 1 ||
        f.socket.bm.entities[0]!.aiControl!.enabled === false,
    );
    expect(f.socket.bm.entities[0]!.aiFailure).toBeUndefined();
  }
  expect(f.socket.bm.isGameOver()).toBe(true);
  await until(
    () =>
      (f.storage.get("delivery") as { completion: string }).completion ===
      "delivered",
  );
  const recovered = await f.rehydrate();
  expect(tacticalState(recovered.bm)).toEqual(tacticalState(f.socket.bm));
  expect(requests).toHaveLength(index);
  expect(f.storage.get("alarm")).toBeUndefined();
});
