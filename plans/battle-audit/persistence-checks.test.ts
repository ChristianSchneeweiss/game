/**
 * Local audit invariant tests. Known bugs fail against the current source;
 * controls establish that the local doubles run the actual seams. No network/DB
 * connections are created. The database double holds a single dungeon/roster;
 * it does not claim to model PostgreSQL concurrency or transaction rollbacks.
 */
import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";
import SuperJSON from "superjson";
import { Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { Goblin } from "../../apps/game/src/enemies/goblin";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import { passiveSkillFactory } from "../../apps/game/src/passive-skills/base/passive-skill.factory";
import { registerRecipes } from "../../apps/server/src/lib/superjson-recipes";
import {
  captureStartingBuilds,
  restoreStartingBuilds,
} from "../../apps/server/src/battle/starting-builds";
import {
  TB_activeBattle,
  TB_battleParticipants,
  TB_battleResult,
  TB_character,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_dungeonEnemy,
  TB_dungeonParticipant,
  TB_equipmentStats,
  TB_loot,
  TB_passivSkillStats,
  type Database,
} from "../../apps/server/src/db/schema";

mock.module("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(public ctx: unknown, public env: unknown) {}
  },
  WorkflowEntrypoint: class {},
  WorkflowStep: class {},
}));
mock.module("../../apps/server/src/clerk", () => ({
  createClerk: () => ({ users: { getUser: async (id: string) => ({ id }) } }),
}));

const { BattleWebsocket } = await import(
  "../../apps/server/src/durable-objects/battle-ws"
);
const { dungeonManager } = await import(
  "../../apps/server/src/game-usecases/dungeon-manager"
);
const { SyncFactory } = await import(
  "../../apps/server/src/game-usecases/sync-factory"
);
const { dungeonRouter } = await import(
  "../../apps/server/src/routers/dungeon-router"
);

let logSpy: ReturnType<typeof spyOn>;
let errorSpy: ReturnType<typeof spyOn>;
beforeAll(() => {
  registerRecipes();
  logSpy = spyOn(console, "log").mockImplementation(() => {});
  errorSpy = spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

function hero() {
  const entity = new Character(
    "audit-hero", "audit-owner", "Audit hero", "TEAM_A", 100, 50,
    { intelligence: 20, vitality: 10, strength: 18, agility: 100 },
    0, 1, 0,
  );
  entity.spells = [createSpellFromType("audit-hit", "basic-attack")];
  return entity;
}

function database() {
  const rows = new Map<unknown, any[]>([
    [TB_character, [{
      id: "audit-hero", userId: "audit-owner", name: "Audit hero",
      health: 100, mana: 50, intelligence: 20, vitality: 10,
      strength: 18, agility: 100, xp: 0, level: 1, statPointsAvailable: 0,
    }]],
    [TB_dungeonData, [{
      id: "audit-dungeon", key: "dungeon1", round: 0, cleared: false,
      activeBattle: false, createdBy: "audit-owner",
      characterData: [{ characterId: "audit-hero", health: 37, mana: 9 }],
    }]],
    [TB_dungeonParticipant, [{ dungeonId: "audit-dungeon", characterId: "audit-hero" }]],
    [TB_dungeonEnemy, [{ id: "audit-goblin", dungeonId: "audit-dungeon", type: "goblin", inRound: 0 }]],
    [TB_equipmentStats, []], [TB_passivSkillStats, []],
    [TB_battleParticipants, []], [TB_dungeonBattle, []],
    [TB_loot, []], [TB_battleResult, []], [TB_activeBattle, []],
  ]);
  const getRows = (table: unknown) => rows.get(table) ?? [];
  let activeWriteFailure = false;
  const db: any = {
    transaction: async (fn: (tx: Database) => unknown) => fn(db),
    select: (selection?: Record<string, unknown>) => {
      let table: unknown;
      const query: any = {
        from: (value: unknown) => { table = value; return query; },
        leftJoin: () => query,
        where: async () => getRows(table).map((row) => {
          const copy = structuredClone(row);
          if (selection?.character === TB_character) return { character: copy, spellStats: null };
          if (selection?.userId) return { userId: copy.userId };
          return copy;
        }),
      };
      return query;
    },
    insert: (table: unknown) => ({
      values: (value: unknown) => {
        const values = Array.isArray(value) ? value : [value];
        if (table !== TB_activeBattle || !activeWriteFailure) {
          rows.set(table, [...getRows(table), ...JSON.parse(JSON.stringify(values))]);
        }
        return {
          onConflictDoNothing: async () => {},
          onConflictDoUpdate: async () => {
            if (table === TB_activeBattle && activeWriteFailure) {
              throw new Error("injected active-battle write failure");
            }
          },
        };
      },
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: async () => getRows(table).forEach((row) => Object.assign(row, values)),
      }),
    }),
    delete: (table: unknown) => ({ where: async () => rows.set(table, []) }),
  };
  return {
    db: db as Database, rows: getRows,
    failActiveWrite: () => { activeWriteFailure = true; },
    allowActiveWrite: () => { activeWriteFailure = false; },
  };
}

function localSocket() {
  const received: { type: string; data: any }[] = [];
  const ws = { send: (message: string) => received.push(SuperJSON.parse(message)) };
  return { ws: ws as unknown as WebSocket, received };
}

async function durableBattle({ lethal = false, faultingCast = false } = {}) {
  const player = hero();
  const enemy = new Goblin("audit-goblin");
  if (lethal) {
    enemy.health = 1;
    player.spells = [createSpellFromType("audit-hit", "cinder-wisp")];
  }
  if (faultingCast) {
    player.spells = [
      createSpellFromType("audit-hit", "cinder-wisp"),
      createSpellFromType("audit-safe", "basic-attack"),
    ];
    player.passiveSkills = [passiveSkillFactory("bloodfang", "audit-passive", player)];
    player.health = 70;
    enemy.health = enemy.maxHealth = 1000;
  }
  const builds = captureStartingBuilds([player, enemy]);
  const storage = new Map<string, unknown>([
    ["startingBuilds", structuredClone(builds)],
    ["battleId", "audit-battle"],
    ["clerkSecretKey", "audit-placeholder"],
  ]);
  let storageFailure = false;
  const { ws, received } = localSocket();
  const data = database();
  let workflowCalls = 0;
  let workflowFailure = false;
  const env: any = {
    BATTLE_DONE_WORKFLOW: { create: async () => {
      workflowCalls++;
      if (workflowFailure) throw new Error("injected workflow create failure");
    } },
  };
  let initialize = Promise.resolve();
  const ctx: any = {
    storage: {
      get: async (key: string) => structuredClone(storage.get(key)),
      put: async (key: string | Record<string, unknown>, value?: unknown) => {
        if (storageFailure) throw new Error("injected durable storage failure");
        const updates = typeof key === "string" ? { [key]: value } : key;
        for (const [k, v] of Object.entries(updates)) storage.set(k, structuredClone(v));
      },
    },
    getWebSockets: () => [],
    blockConcurrencyWhile: (fn: () => Promise<void>) => { initialize = fn(); },
  };
  const getDbSpy = spyOn(BattleWebsocket.prototype as any, "getDb")
    .mockReturnValue(data.db);
  let socket: InstanceType<typeof BattleWebsocket>;
  try {
    socket = new BattleWebsocket(ctx, env);
    await initialize;
  } finally {
    getDbSpy.mockRestore();
  }
  ctx.getWebSockets = () => [ws];
  socket.sessions.set(ws, { id: "audit-owner" });
  const cast = (spellId = "audit-hit") => SuperJSON.stringify({
    type: "castSpell",
    data: {
      entityId: "audit-hero", spellId, targetIds: ["audit-goblin"],
      requestId: "audit-request", revision: socket.bm.events.length,
    },
  });
  const rehydrate = async () => {
    const restoredCtx: any = { ...ctx, getWebSockets: () => [] };
    restoredCtx.blockConcurrencyWhile = (fn: () => Promise<void>) => { initialize = fn(); };
    const dbSpy = spyOn(BattleWebsocket.prototype as any, "getDb").mockReturnValue(data.db);
    try {
      const restored = new BattleWebsocket(restoredCtx, env);
      await initialize;
      return restored;
    } finally {
      dbSpy.mockRestore();
    }
  };
  return {
    socket, data, ws, received, cast, rehydrate, storage,
    workflowCalls: () => workflowCalls,
    failStorage: () => { storageFailure = true; },
    allowStorage: () => { storageFailure = false; },
    failWorkflow: () => { workflowFailure = true; },
    allowWorkflow: () => { workflowFailure = false; },
  };
}

describe("persistence audit: dungeon state handoff", () => {
  test("control: frozen starting builds retain resource attrition", () => {
    const player = hero();
    player.health = 37;
    player.mana = 9;
    const [restored] = restoreStartingBuilds(captureStartingBuilds([player]));
    expect([restored.health, restored.mana]).toEqual([37, 9]);
  });

  test("dungeon-to-SyncFactory handoff retains saved HP/mana", async () => {
    const data = database();
    const dungeon = await dungeonManager.getDungeon("audit-dungeon", data.db);
    expect([dungeon.playerTeam[0].health, dungeon.playerTeam[0].mana]).toEqual([37, 9]);
    const factory = new SyncFactory(data.db);
    await factory.add("audit-battle", dungeon.playerTeam, dungeon.actualEnemies[0]);
    const rebuilt = await factory.get("audit-battle");
    expect([rebuilt.characters[0].health, rebuilt.characters[0].mana]).toEqual([37, 9]);
  });

  test("a successful retry after a loss advances exactly one dungeon room", async () => {
    const data = database();
    data.rows(TB_dungeonBattle).push({ battleId: "loss", dungeonId: "audit-dungeon", round: 0 });
    await dungeonManager.handleDungeonCleared("audit-dungeon", "loss", [], [], "TEAM_B", data.db);
    expect(data.rows(TB_dungeonData)[0].round).toBe(0);
    data.rows(TB_dungeonBattle).push({ battleId: "win", dungeonId: "audit-dungeon", round: 0 });
    await dungeonManager.handleDungeonCleared("audit-dungeon", "win", [], [], "TEAM_A", data.db);
    expect(data.rows(TB_dungeonData)[0].round).toBe(1);
  });

  test("reprocessing a defeat does not issue duplicate loot", async () => {
    const data = database();
    data.rows(TB_dungeonBattle).push({ battleId: "loss", dungeonId: "audit-dungeon", round: 0 });
    const killedEnemy = new Goblin("audit-goblin");
    const party = [{ id: "audit-hero", health: 0, mana: 9, dead: true }];
    for (let i = 0; i < 2; i++) {
      await dungeonManager.handleDungeonCleared("audit-dungeon", "loss", [killedEnemy], party, "TEAM_B", data.db);
    }
    expect(data.rows(TB_loot)).toHaveLength(1);
  });

  test("control: repeating a win at its original round does not duplicate loot", async () => {
    const data = database();
    data.rows(TB_dungeonBattle).push({ battleId: "win", dungeonId: "audit-dungeon", round: 0 });
    const party = [{ id: "audit-hero", health: 37, mana: 9, dead: false }];
    for (let i = 0; i < 2; i++) {
      await dungeonManager.handleDungeonCleared("audit-dungeon", "win", [new Goblin("audit-goblin")], party, "TEAM_A", data.db);
    }
    expect(data.rows(TB_loot)).toHaveLength(1);
    expect(data.rows(TB_dungeonData)[0].round).toBe(1);
  });

  test("reprocessing an earlier victory cannot complete a newer active battle or issue its rewards again", async () => {
    const data = database();
    data.rows(TB_dungeonBattle).push({ battleId: "win", dungeonId: "audit-dungeon", round: 0 });
    const party = [{ id: "audit-hero", health: 37, mana: 9, dead: false }];
    await dungeonManager.handleDungeonCleared("audit-dungeon", "win", [new Goblin("audit-goblin")], party, "TEAM_A", data.db);
    data.rows(TB_dungeonBattle).push({ battleId: "next", dungeonId: "audit-dungeon", round: 1 });
    data.rows(TB_dungeonData)[0].activeBattle = true;
    await dungeonManager.handleDungeonCleared("audit-dungeon", "win", [new Goblin("audit-goblin")], party, "TEAM_A", data.db);
    expect({
      round: data.rows(TB_dungeonData)[0].round,
      activeBattle: data.rows(TB_dungeonData)[0].activeBattle,
      rewardRows: data.rows(TB_loot).length,
    }).toEqual({ round: 1, activeBattle: true, rewardRows: 1 });
  });
});

describe("persistence audit: actual Durable Object method seams", () => {
  test("control: accepted commands survive constructor rehydration", async () => {
    const audit = await durableBattle();
    await audit.socket.webSocketMessage(audit.ws, audit.cast());
    expect(audit.received.map((m) => m.type)).toContain("castAccepted");
    const restored = await audit.rehydrate();
    expect(restored.bm.events).toEqual(audit.socket.bm.events);
    expect(restored.bm.entities.map((e) => [e.id, e.health, e.mana]))
      .toEqual(audit.socket.bm.entities.map((e) => [e.id, e.health, e.mana]));
  });

  test("a failed command-log write leaves live and recovered state consistent", async () => {
    const audit = await durableBattle();
    const initialEvents = structuredClone(audit.socket.bm.events);
    audit.failStorage();
    await audit.socket.webSocketMessage(audit.ws, audit.cast());
    expect(audit.received.map((m) => m.type)).toContain("rejected");
    expect(audit.storage.get("messages")).toBeUndefined();
    audit.allowStorage();
    const restored = await audit.rehydrate();
    expect(restored.bm.events).toEqual(initialEvents);
    expect(restored.bm.events).toEqual(audit.socket.bm.events);
  });

  test("a cast that throws after a partial mutation cannot poison the next accepted command's recovery", async () => {
    const audit = await durableBattle({ faultingCast: true });
    // The first legal cast hits the current Bloodfang + magical damage failure.
    // The following legal physical cast demonstrates the journal/revision gap.
    await audit.socket.webSocketMessage(audit.ws, audit.cast());
    await audit.socket.webSocketMessage(audit.ws, audit.cast("audit-safe"));
    const restored = await audit.rehydrate();
    expect(restored.bm.events).toEqual(audit.socket.bm.events);
    expect(restored.bm.entities.map((e) => [e.id, e.health, e.mana]))
      .toEqual(audit.socket.bm.entities.map((e) => [e.id, e.health, e.mana]));
    expect(restored.bm.rng.state!()).toEqual(audit.socket.bm.rng.state!());
  });

  test("a lethal cast completes after recovery from an active-battle write failure", async () => {
    const audit = await durableBattle({ lethal: true });
    audit.data.failActiveWrite();
    await audit.socket.webSocketMessage(audit.ws, audit.cast());
    expect(audit.socket.bm.isGameOver()).toBe(true);
    audit.data.allowActiveWrite();
    await audit.socket.setup("audit-placeholder", "audit-battle");
    const restored = await audit.rehydrate();
    expect(restored.bm.isGameOver()).toBe(true);
    await restored.setup("audit-placeholder", "audit-battle");
    expect(audit.data.rows(TB_battleResult)).toHaveLength(1);
    expect(audit.workflowCalls()).toBe(1);
  });

  test("a transient completion-workflow error is retried on warm or cold setup", async () => {
    const audit = await durableBattle({ lethal: true });
    audit.failWorkflow();
    await audit.socket.webSocketMessage(audit.ws, audit.cast());
    expect(audit.socket.bm.isGameOver()).toBe(true);
    expect(audit.data.rows(TB_battleResult)).toHaveLength(1);
    expect(audit.workflowCalls()).toBe(1);
    expect(audit.received.map((m) => m.type)).not.toContain("finished");
    audit.allowWorkflow();
    await audit.socket.setup("audit-placeholder", "audit-battle");
    const restored = await audit.rehydrate();
    await restored.setup("audit-placeholder", "audit-battle");
    expect(audit.workflowCalls()).toBe(2);
  });

  test("control: successful lethal cast saves the result and starts one workflow", async () => {
    const audit = await durableBattle({ lethal: true });
    await audit.socket.webSocketMessage(audit.ws, audit.cast());
    expect(audit.received.find((message) => message.type === "rejected")).toBeUndefined();
    expect(audit.data.rows(TB_battleResult)).toHaveLength(1);
    expect(audit.workflowCalls()).toBe(1);
    expect(audit.received.map((m) => m.type)).toEqual(["castAccepted", "state", "finished"]);
  });
});

describe("persistence audit: authenticated dungeon API", () => {
  test("concurrent fight requests create only one active battle for a dungeon", async () => {
    const data = database();
    const caller = dungeonRouter.createCaller({
      db: data.db, session: { id: "audit-owner" },
    } as any);
    const attempts = await Promise.allSettled([
      caller.fightDungeon({ id: "audit-dungeon" }),
      caller.fightDungeon({ id: "audit-dungeon" }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(data.rows(TB_dungeonBattle)).toHaveLength(1);
  });

  test("a logged-in account outside the dungeon cannot start its battle", async () => {
    const data = database();
    const caller = dungeonRouter.createCaller({
      db: data.db, session: { id: "audit-unrelated-user" },
    } as any);
    await expect(caller.fightDungeon({ id: "audit-dungeon" })).rejects.toThrow();
    expect(data.rows(TB_dungeonData)[0].activeBattle).toBe(false);
    expect(data.rows(TB_dungeonBattle)).toHaveLength(0);
  });
});
