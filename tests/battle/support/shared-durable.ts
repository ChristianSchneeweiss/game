import { mock } from "bun:test";
import { eq } from "drizzle-orm";
import SuperJSON from "superjson";
import { Character } from "../../../apps/game/src/base-entity";
import { Goblin } from "../../../apps/game/src/enemies/goblin";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import { captureStartingBuilds } from "../../../apps/server/src/battle/starting-builds";
import {
  TB_character,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_dungeonParticipant,
  TB_user,
  type Database,
} from "../../../apps/server/src/db/schema";
import type { ResponseMessage } from "../../../apps/server/src/battle/protocol";
import { registerRecipes } from "../../../apps/server/src/lib/superjson-recipes";

let activeDatabase: Database;
mock.module("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}));
mock.module("@clerk/backend", () => ({
  createClerkClient: () => ({
    users: { getUser: async (id: string) => ({ id }) },
  }),
}));
mock.module("drizzle-orm/postgres-js", () => ({
  drizzle: () => activeDatabase,
}));
const { BattleWebsocket } =
  await import("../../../apps/server/src/durable-objects/battle-ws");
registerRecipes();

/** Replace only the unavailable Worker host; commands, journal and DB settlement stay real. */
export async function sharedDurable(db: Database, lethal = false) {
  activeDatabase = db;
  await db.insert(TB_user).values({ id: "guest", username: "Guest" });
  await db
    .insert(TB_character)
    .values({
      id: "guest-hero",
      userId: "guest",
      name: "Guest hero",
      health: 100,
      mana: 50,
      intelligence: 20,
      vitality: 10,
      strength: 18,
      agility: 90,
    });
  await db
    .insert(TB_dungeonParticipant)
    .values({ dungeonId: "audit-dungeon", characterId: "guest-hero" });
  await db
    .update(TB_dungeonData)
    .set({
      activeBattle: true,
      activeBattleId: "audit-battle",
      characterData: [
        { characterId: "audit-hero", health: 100, mana: 50 },
        { characterId: "guest-hero", health: 100, mana: 50 },
      ],
    })
    .where(eq(TB_dungeonData.id, "audit-dungeon"));
  await db
    .insert(TB_dungeonBattle)
    .values({ dungeonId: "audit-dungeon", battleId: "audit-battle", round: 0 });
  const heroes = [
    new Character(
      "audit-hero",
      "audit-owner",
      "Host",
      "TEAM_A",
      100,
      50,
      { intelligence: 20, vitality: 10, strength: 18, agility: 100 },
      0,
      1,
      0,
    ),
    new Character(
      "guest-hero",
      "guest",
      "Guest",
      "TEAM_A",
      100,
      50,
      { intelligence: 20, vitality: 10, strength: 18, agility: 90 },
      0,
      1,
      0,
    ),
  ];
  for (const hero of heroes)
    hero.spells = [
      createSpellFromType(
        `${hero.id}-hit`,
        lethal ? "cinder-wisp" : "basic-attack",
      ),
    ];
  const enemy = new Goblin("audit-goblin");
  enemy.health = enemy.maxHealth = lethal ? 1 : 1000;
  const storage = new Map<string, unknown>([
    ["battleId", "audit-battle"],
    ["startingBuilds", captureStartingBuilds([...heroes, enemy])],
  ]);
  let failStorage = false;
  const messages: ResponseMessage[][] = [[], []];
  const sockets = ["audit-owner", "guest"].map(
    (id, index) =>
      ({
        send: (raw: string) => messages[index]!.push(SuperJSON.parse(raw)),
        close: () => {},
        deserializeAttachment: () => ({ id }),
      }) as unknown as WebSocket,
  );
  const connected = new Set(sockets);
  const env = {
    DATABASE_URL: "in-memory-only",
    BATTLE_DONE_WORKFLOW: {
      create: async () => ({ id: "audit-battle" }),
    },
  } as unknown as Env;
  async function construct() {
    let ready = Promise.resolve();
    const ctx = {
      storage: {
        get: async (key: string) => structuredClone(storage.get(key)),
        put: async (key: string | Record<string, unknown>, value?: unknown) => {
          if (failStorage) throw new Error("Storage unavailable");
          for (const [name, entry] of Object.entries(
            typeof key === "string" ? { [key]: value } : key,
          ))
            storage.set(name, structuredClone(entry));
        },
        setAlarm: async (time: number) => {
          storage.set("alarm", time);
        },
        getAlarm: async () => storage.get("alarm"),
        deleteAlarm: async () => {
          storage.delete("alarm");
        },
      },
      getWebSockets: () => [...connected],
      blockConcurrencyWhile: (fn: () => Promise<void>) => {
        ready = fn();
        return ready;
      },
    } as unknown as DurableObjectState;
    const socket = new BattleWebsocket(ctx, env);
    await ready;
    return socket;
  }
  const socket = await construct();
  return {
    socket,
    env,
    sockets,
    messages,
    storage,
    rehydrate: construct,
    setStorageFailure: (fail: boolean) => {
      failStorage = fail;
    },
    disconnect: async (index: number) => {
      connected.delete(sockets[index]!);
      await socket.webSocketClose(sockets[index]!, 1000, "", true);
    },
    reconnect: (index: number) => {
      connected.add(sockets[index]!);
    },
    cast: (entityId = "audit-hero", revision = socket.bm.events.length) =>
      SuperJSON.stringify({
        type: "castSpell",
        data: {
          entityId,
          spellId: `${entityId}-hit`,
          targetIds: ["audit-goblin"],
          revision,
          requestId: crypto.randomUUID(),
        },
      }),
  };
}
