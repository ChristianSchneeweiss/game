import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import SuperJSON from "superjson";
import { Character } from "../../../apps/game/src/base-entity";
import { Goblin } from "../../../apps/game/src/enemies/goblin";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import { captureStartingBuilds } from "../../../apps/server/src/battle/starting-builds";
import type { ResponseMessage } from "../../../apps/server/src/battle/protocol";
import { registerRecipes } from "../../../apps/server/src/lib/superjson-recipes";
import {
  canConnect,
  socketLimits,
} from "../../../apps/server/src/lib/socket-limits";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
const keys: string[] = [];
mock.module("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}));
mock.module("@clerk/backend", () => ({
  createClerkClient: ({ secretKey }: { secretKey: string }) => {
    keys.push(secretKey);
    return { users: { getUser: async (id: string) => ({ id }) } };
  },
}));
mock.module("drizzle-orm/postgres-js", () => ({ drizzle: () => data.db }));
mock.module("drizzle-orm/neon-http", () => ({ drizzle: () => data.db }));
const { BattleWebsocket } =
  await import("../../../apps/server/src/durable-objects/battle-ws");
registerRecipes();
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

function fixture() {
  const hero = new Character(
    "audit-hero",
    "audit-owner",
    "Hero",
    "TEAM_A",
    100,
    50,
    { intelligence: 20, vitality: 10, strength: 18, agility: 100 },
    0,
    1,
    0,
  );
  hero.spells = [createSpellFromType("audit-hit", "basic-attack")];
  const storage = new Map<string, unknown>([
    ["battleId", "audit-battle"],
    ["clerkSecretKey", "legacy-synthetic-key"],
    [
      "startingBuilds",
      captureStartingBuilds([hero, new Goblin("audit-goblin")]),
    ],
  ]);
  const received: ResponseMessage[] = [];
  const spectatorMessages: ResponseMessage[] = [];
  const closed: number[] = [];
  const ws = {
    send: (raw: string) => received.push(SuperJSON.parse<ResponseMessage>(raw)),
    close: (code: number) => closed.push(code),
    deserializeAttachment: () => ({ id: "audit-owner" }),
  } as unknown as WebSocket;
  const spectator = {
    send: (raw: string) =>
      spectatorMessages.push(SuperJSON.parse<ResponseMessage>(raw)),
    close: (code: number) => closed.push(code),
    deserializeAttachment: () => ({ id: "outsider" }),
  } as unknown as WebSocket;
  async function construct() {
    let initialize = Promise.resolve();
    const ctx = {
      storage: {
        get: async (key: string) => structuredClone(storage.get(key)),
        put: async (key: string | Record<string, unknown>, value?: unknown) => {
          for (const [name, entry] of Object.entries(
            typeof key === "string" ? { [key]: value } : key,
          ))
            storage.set(name, structuredClone(entry));
        },
      },
      getWebSockets: () => [ws, spectator],
      blockConcurrencyWhile: (fn: () => Promise<void>) => {
        initialize = fn();
        return initialize;
      },
    } as unknown as DurableObjectState;
    const socket = new BattleWebsocket(ctx, {
      CLERK_SECRET_KEY: "runtime-synthetic-key",
      DATABASE_URL: "in-memory-only",
    } as Env);
    await initialize;
    return socket;
  }
  return {
    storage,
    ws,
    spectator,
    received,
    spectatorMessages,
    closed,
    construct,
  };
}

test("legacy journals gain v1 metadata and erase secret copies; unknown versions and invalid builds fail closed", async () => {
  const f = fixture();
  const socket = await f.construct();
  expect(f.storage.get("journalVersion")).toBe(1);
  expect(f.storage.get("clerkSecretKey")).toBeNull();
  await socket.setup("ignored-synthetic-key", "audit-battle");
  expect(f.storage.get("clerkSecretKey")).toBeNull();
  expect(keys.every((key) => key === "runtime-synthetic-key")).toBe(true);
  f.storage.set("journalVersion", 99);
  await expect(f.construct()).rejects.toThrow(
    "Unsupported battle journal version",
  );
  expect(f.storage.get("journalVersion")).toBe(99);
  f.storage.set("journalVersion", 1);
  f.storage.set("startingBuilds", [{ invalid: true }]);
  await expect(f.construct()).rejects.toThrow(
    "Invalid saved battle starting builds",
  );
});

test("invalid and foreign-owner battle commands cannot mutate or amplify state to spectators", async () => {
  const f = fixture();
  const socket = await f.construct();
  const revision = socket.bm.events.length;
  await socket.webSocketMessage(f.ws, "{");
  await socket.webSocketMessage(
    f.ws,
    SuperJSON.stringify({ type: "unknown", data: {} }),
  );
  expect(f.received.map((message) => message.type)).toEqual([
    "rejected",
    "state",
    "rejected",
    "state",
  ]);
  expect(f.spectatorMessages).toEqual([]);
  await socket.webSocketMessage(
    f.spectator,
    SuperJSON.stringify({
      type: "castSpell",
      data: {
        entityId: "audit-hero",
        spellId: "audit-hit",
        targetIds: ["audit-goblin"],
        revision,
      },
    }),
  );
  expect(socket.bm.events.length).toBe(revision);
  expect(f.storage.get("messages")).toBeUndefined();
  await socket.webSocketMessage(f.ws, new ArrayBuffer(8));
  await socket.webSocketMessage(
    f.ws,
    "x".repeat(socketLimits.battleFrameBytes + 1),
  );
  expect(f.closed).toEqual([1003, 1009]);
  expect(f.storage.get("messages")).toBeUndefined();
});

test("connection admission reserves room capacity and caps sockets for one identity", () => {
  const sessions = new Map<WebSocket, { id: string }>();
  for (let n = 0; n < socketLimits.userConnections; n++)
    sessions.set({} as WebSocket, { id: "owner" });
  expect(canConnect(sessions, "owner")).toBe(false);
  expect(canConnect(sessions, "spectator")).toBe(true);
  for (let n = sessions.size; n < socketLimits.roomConnections; n++)
    sessions.set({} as WebSocket, { id: `spectator-${n}` });
  expect(canConnect(sessions, "new-user")).toBe(false);
});
