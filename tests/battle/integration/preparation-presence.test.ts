import {
  afterEach,
  beforeEach,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import { database, type TestDatabase } from "../support/database";
import { appRouter } from "../../../apps/server/src/routers";
import type { Context } from "../../../apps/server/src/lib/context";

let data: TestDatabase;
mock.module("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}));
mock.module("drizzle-orm/postgres-js", () => ({ drizzle: () => data.db }));
const { PreparationPresence } =
  await import("../../../apps/server/src/durable-objects/preparation-presence");
const caller = () =>
  appRouter.createCaller({
    db: data.db,
    session: { id: "audit-owner" },
  } as unknown as Context);
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  setSystemTime();
  await data.close();
});
async function ready(id: string) {
  const preparation = await caller().preparation.get({ id });
  return caller().preparation.ready({
    id,
    ready: true,
    expectedRevision: preparation.revision,
    expectedBuildRevision: preparation.participants[0]!.buildRevision,
  });
}

async function room() {
  const { id } = await caller().preparation.create({ key: "dungeon1" });
  await caller().preparation.selectCharacter({ id, characterId: "audit-hero" });
  const received: string[][] = [[], []];
  const sockets = [0, 1].map((index) => {
    let attachment: unknown = {
      id: "audit-owner",
      connectionId: `socket-${index}`,
      seenAt: Date.now(),
    };
    return {
      deserializeAttachment: () => attachment,
      serializeAttachment: (next: unknown) => {
        attachment = next;
      },
      close: () => {},
      send: (raw: string) => received[index]!.push(raw),
    } as unknown as WebSocket;
  });
  const live = new Set(sockets);
  const storage = new Map<string, unknown>([["preparationId", id]]);
  async function construct() {
    let initialized = Promise.resolve();
    const ctx = {
      getWebSockets: () => [...live],
      storage: {
        get: async (key: string) => storage.get(key),
        put: async (key: string, value: unknown) => {
          storage.set(key, value);
        },
        setAlarm: async (time: number) => {
          storage.set("alarm", time);
        },
        deleteAlarm: async () => {
          storage.delete("alarm");
        },
      },
      blockConcurrencyWhile: (fn: () => Promise<void>) => {
        initialized = fn();
        return initialized;
      },
    } as unknown as DurableObjectState;
    const presence = new PreparationPresence(ctx, {
      DATABASE_URL: "in-memory-only",
    } as Env);
    await initialized;
    return presence;
  }
  return {
    id,
    sockets,
    received,
    live,
    storage,
    presence: await construct(),
    rehydrate: construct,
  };
}

test("multiple tabs retain live consent until the last socket closes; stale callbacks cannot reconnect", async () => {
  const f = await room();
  await ready(f.id);
  await f.presence.webSocketClose(f.sockets[0]!);
  expect(
    (await caller().preparation.get({ id: f.id })).participants[0]!.ready,
  ).toBe(true);
  await f.presence.webSocketClose(f.sockets[1]!);
  await f.presence.webSocketMessage(
    f.sockets[0]!,
    JSON.stringify({ type: "ping" }),
  );
  const participant = (await caller().preparation.get({ id: f.id }))
    .participants[0]!;
  expect(participant.connected).toBe(false);
  expect(participant.ready).toBe(false);
});

test("cold recovery clears vanished sockets without closing the saved preparation", async () => {
  const f = await room();
  await ready(f.id);
  f.live.clear();
  await f.rehydrate();
  const preparation = await caller().preparation.get({ id: f.id });
  expect(preparation.closedAt).toBeNull();
  expect(preparation.participants[0]!.ready).toBe(false);
  expect(preparation.participants[0]!.connected).toBe(false);
});

test("an expired heartbeat clears readiness and a late ping cannot restore it", async () => {
  const f = await room();
  await ready(f.id);
  setSystemTime(Date.now() + 31_000);
  await f.presence.alarm();
  await f.presence.webSocketMessage(
    f.sockets[0]!,
    JSON.stringify({ type: "ping" }),
  );
  const preparation = await caller().preparation.get({ id: f.id });
  expect(preparation.participants[0]!.ready).toBe(false);
  expect(preparation.participants[0]!.connected).toBe(false);
  expect(f.received.flat()).toEqual([]);
});

test("presence admission rejects an unrelated account and ordinary HTTP requests", async () => {
  const f = await room();
  const ordinary = await f.presence.fetch(
    new Request("https://game.example/presence?userId=audit-owner"),
  );
  expect(ordinary.status).toBe(426);
  await expect(
    f.presence.fetch(
      new Request("https://game.example/presence?userId=outsider", {
        headers: { Upgrade: "websocket" },
      }),
    ),
  ).rejects.toThrow("another party");
  expect(
    (await caller().preparation.get({ id: f.id })).participants,
  ).toHaveLength(1);
});

test("closing a lobby evicts its sockets and prevents new presence admission", async () => {
  const f = await room();
  await caller().preparation.leave({ id: f.id });
  await f.presence.alarm();
  await f.presence.webSocketMessage(
    f.sockets[0]!,
    JSON.stringify({ type: "ping" }),
  );
  expect(f.received.flat()).toEqual([]);
  expect(f.storage.has("alarm")).toBe(false);
  const closed = await f.presence.fetch(
    new Request("https://game.example/presence?userId=audit-owner", {
      headers: { Upgrade: "websocket" },
    }),
  );
  expect(closed.status).toBe(409);
});
