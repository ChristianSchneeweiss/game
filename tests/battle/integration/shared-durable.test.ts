import { afterEach, beforeEach, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { database, type TestDatabase } from "../support/database";
import { sharedDurable } from "../support/shared-durable";
import { combatState } from "../support/invariants";
import {
  TB_character,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_dungeonEnemy,
  TB_loot,
} from "../../../apps/server/src/db/schema";
import { dungeonManager } from "../../../apps/server/src/game-usecases/dungeon-manager";
import { bmStorage } from "../../../apps/server/src/game-usecases/bm-storage";
import { LootManager } from "../../../apps/server/src/game-usecases/loot-manager";
import { Goblin } from "../../../apps/game/src/enemies/goblin";
import { abandonSharedDungeon } from "../../../apps/server/src/game-usecases/abandon-shared-dungeon";
import { abandonDungeon } from "../../../apps/server/src/game-usecases/dungeon-abandon";
import { beginDungeonAttempt } from "../../../apps/server/src/game-usecases/dungeon-attempt";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

test("two owners see committed state; an absent owner's turn waits and resumes from the journal", async () => {
  const f = await sharedDurable(data.db);
  await f.socket.webSocketMessage(f.sockets[0]!, f.cast());
  const hostState = f.messages[0]!.filter(
    (message) => message.type === "state",
  ).at(-1);
  expect(
    f.messages[1]!.filter((message) => message.type === "state").at(-1),
  ).toEqual(hostState);
  expect(f.socket.bm.getCurrentRound().orderQueue[0]).toBe("guest-hero");
  const before = combatState(f.socket.bm);
  await f.disconnect(1);
  await f.socket.webSocketMessage(f.sockets[0]!, f.cast("guest-hero"));
  // A callback from the closed socket cannot supply the missing owner's action.
  await f.socket.webSocketMessage(f.sockets[1]!, f.cast("guest-hero"));
  expect(combatState(f.socket.bm)).toEqual(before);
  f.reconnect(1);
  const recovered = await f.rehydrate();
  expect(combatState(recovered.bm)).toEqual(before);
  await recovered.webSocketMessage(
    f.sockets[1]!,
    f.cast("guest-hero", recovered.bm.events.length),
  );
  expect(recovered.bm.events.length).toBeGreaterThan(f.socket.bm.events.length);
});

test("either participant can abandon an active run; later casts, completion and recovery cannot revive it", async () => {
  const f = await sharedDurable(data.db);
  await expect(f.socket.abandon("audit-dungeon", "outsider")).rejects.toThrow();
  expect(f.storage.has("abandonment")).toBe(false);
  await f.socket.webSocketMessage(f.sockets[0]!, f.cast());
  const before = combatState(f.socket.bm);
  const result = await f.socket.abandon("audit-dungeon", "guest");
  if ("retry" in result) throw new Error("Unexpected encounter change");
  expect(result.abandonedAt).toBeInstanceOf(Date);
  expect(
    f.messages.every((messages) =>
      messages.some((message) => message.type === "abandoned"),
    ),
  ).toBe(true);
  await f.socket.webSocketMessage(f.sockets[1]!, f.cast("guest-hero"));
  expect(combatState(f.socket.bm)).toEqual(before);
  const recovered = await f.rehydrate();
  await recovered.webSocketMessage(
    f.sockets[1]!,
    f.cast("guest-hero", recovered.bm.events.length),
  );
  expect(combatState(recovered.bm)).toEqual(before);
  await dungeonManager.handleDungeonCleared(
    "audit-dungeon",
    "audit-battle",
    [new Goblin("audit-goblin")],
    [
      { id: "audit-hero", health: 100, mana: 50, dead: false },
      { id: "guest-hero", health: 100, mana: 50, dead: false },
    ],
    "TEAM_A",
    data.db,
  );
  expect((await data.db.select().from(TB_dungeonData))[0]!.round).toBe(0);
  expect(await data.db.select().from(TB_loot)).toHaveLength(0);
  expect(
    (await data.db.select().from(TB_dungeonBattle))[0]!.completedAt,
  ).toBeNull();
});

test("a committed final cast settles once before abandonment even when delivery initially fails", async () => {
  const f = await sharedDurable(data.db, true);
  await data.failWrites("battle_result");
  await f.socket.webSocketMessage(f.sockets[0]!, f.cast());
  expect(f.socket.bm.isGameOver()).toBe(true);
  await expect(f.socket.abandon("audit-dungeon", "guest")).rejects.toThrow();
  expect(f.storage.has("abandonment")).toBe(true);
  await data.allowWrites("battle_result");
  const recovered = await f.rehydrate();
  await recovered.abandon("audit-dungeon", "audit-owner");
  await recovered.alarm();
  expect((await bmStorage.get("audit-battle", data.db)).winner).toBe("TEAM_A");
  expect((await data.db.select().from(TB_dungeonData))[0]!.round).toBe(1);
  expect(
    (await data.db.select().from(TB_dungeonBattle))[0]!.completedAt,
  ).toBeInstanceOf(Date);
  expect(await data.db.select().from(TB_loot)).toHaveLength(2);
  const heroes = await data.db.select().from(TB_character);
  expect(heroes.every((hero) => hero.xp === new Goblin("xp").xp)).toBe(true);
  const [reward] = await data.db
    .select()
    .from(TB_loot)
    .where(eq(TB_loot.userId, "guest"));
  await new LootManager("guest", data.db).claim(reward!.id);
  expect(
    await data.db.select().from(TB_loot).where(eq(TB_loot.userId, "guest")),
  ).toHaveLength(0);
  await recovered.abandon("audit-dungeon", "guest");
  expect(await data.db.select().from(TB_loot)).toHaveLength(1);
});

test("a failed intent write does not abandon an encounter or consume its next command", async () => {
  const f = await sharedDurable(data.db);
  f.setStorageFailure(true);
  await expect(
    f.socket.abandon("audit-dungeon", "audit-owner"),
  ).rejects.toThrow("Storage unavailable");
  expect(
    (await data.db.select().from(TB_dungeonData))[0]!.abandonedAt,
  ).toBeNull();
  f.setStorageFailure(false);
  await f.socket.webSocketMessage(f.sockets[0]!, f.cast());
  expect(
    f.messages[0]!.some((message) => message.type === "castAccepted"),
  ).toBe(true);
});

test("abandonment follows a newer encounter instead of ending its run through the previous battle object", async () => {
  const f = await sharedDurable(data.db, true);
  await f.socket.webSocketMessage(f.sockets[0]!, f.cast());
  const result = await bmStorage.get("audit-battle", data.db);
  await data.db
    .insert(TB_dungeonEnemy)
    .values({ dungeonId: "audit-dungeon", type: "goblin", inRound: 1 });
  const routed: string[] = [];
  let nextBattle = "";
  const env = {
    BATTLE_WEBSOCKET: {
      idFromName: (id: string) => id,
      get: (battleId: string) => ({
        setup: async () => {
          routed.push(battleId);
          if (battleId !== "audit-battle") return;
          await dungeonManager.handleDungeonCleared(
            "audit-dungeon",
            "audit-battle",
            [new Goblin("audit-goblin")],
            result.teamA,
            "TEAM_A",
            data.db,
          );
          nextBattle = await beginDungeonAttempt(
            "audit-dungeon",
            "audit-owner",
            data.db,
          );
        },
        abandon: async (id: string, userId: string) => {
          if (battleId === "audit-battle") {
            const stale = await f.socket.abandon(id, userId);
            expect(stale).toEqual({ retry: true });
            const [current] = await data.db.select().from(TB_dungeonData);
            expect(current!.activeBattleId).toBe(nextBattle);
            expect(current!.abandonedAt).toBeNull();
            return stale;
          }
          // This stub represents the new encounter's externally frozen journal.
          return abandonDungeon(id, userId, data.db, {
            allowActiveBattle: true,
            expectedBattleId: battleId,
          });
        },
      }),
    },
  } as unknown as Env;
  const ended = await abandonSharedDungeon(
    "audit-dungeon",
    "guest",
    data.db,
    env,
  );
  expect(routed).toEqual(["audit-battle", nextBattle]);
  expect(ended.battleId).toBe(nextBattle);
  expect(ended.abandonedAt).toBeInstanceOf(Date);
  expect(f.storage.get("abandonment")).toBeNull();
});
