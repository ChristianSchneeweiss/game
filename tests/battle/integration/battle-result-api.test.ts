import { afterEach, beforeEach, expect, test } from "bun:test";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { sql } from "drizzle-orm";
import { deserialize, serialize, type SuperJSONResult } from "superjson";
import { TB_battleResult } from "../../../apps/server/src/db/schema";
import type { Context } from "../../../apps/server/src/lib/context";
import { appRouter } from "../../../apps/server/src/routers/index";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

function getBattle(battleId: string) {
  const input = encodeURIComponent(JSON.stringify(serialize(battleId)));
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: new Request(`https://game.example/trpc/getBattle?input=${input}`),
    router: appRouter,
    createContext: () => ({ db: data.db, session: null }) as unknown as Context,
  });
}

function savedResult() {
  return {
    battleId: "saved-battle",
    timelineData: serialize([]),
    startEntityData: serialize([{ characterId: "audit-hero", health: 37, mana: 9 }]),
    participants: serialize([]),
    effectTracking: serialize(new Map()),
    winner: "TEAM_A" as const,
    teamA: serialize([{ id: "audit-hero", health: 37, mana: 9, dead: false }]),
    teamB: serialize([{ id: "audit-goblin", type: "goblin", health: 0, dead: true }]),
  };
}

test("an unsaved battle result returns NOT_FOUND instead of an internal server error", async () => {
  const response = await getBattle("active-battle-without-result");
  expect(response.status).toBe(404);
  expect(await response.json()).toHaveProperty("error.json.data.code", "NOT_FOUND");
});

test("saved results remain public and preserve replay data", async () => {
  await data.db.insert(TB_battleResult).values(savedResult());
  const response = await getBattle("saved-battle");
  expect(response.status).toBe(200);
  const body = await response.json() as { result: { data: SuperJSONResult } };
  expect(deserialize<Record<string, unknown>>(body.result.data)).toEqual({
    timelineData: [],
    startEntityData: [{ characterId: "audit-hero", health: 37, mana: 9 }],
    participants: [],
    effectTracking: new Map(),
    winner: "TEAM_A",
    teamA: [{ id: "audit-hero", health: 37, mana: 9, dead: false }],
    teamB: [{ id: "audit-goblin", type: "goblin", health: 0, dead: true }],
  });
});

test("database failures remain internal server errors", async () => {
  await data.db.execute(sql`DROP TABLE battle_result`);
  const response = await getBattle("saved-battle");
  expect(response.status).toBe(500);
  expect(await response.json()).toHaveProperty("error.json.data.code", "INTERNAL_SERVER_ERROR");
});

test("invalid saved replay data remains an internal server error", async () => {
  await data.db.insert(TB_battleResult).values({
    ...savedResult(),
    timelineData: serialize("invalid timeline"),
  });
  const response = await getBattle("saved-battle");
  expect(response.status).toBe(500);
  expect(await response.json()).toHaveProperty("error.json.data.code", "INTERNAL_SERVER_ERROR");
});
