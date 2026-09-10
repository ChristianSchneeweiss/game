import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { Goblin } from "../../../apps/game/src/enemies/goblin";
import { TB_dungeonBattle, TB_dungeonData } from "../../../apps/server/src/db/schema";
import { dungeonManager } from "../../../apps/server/src/game-usecases/dungeon-manager";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { LootManager } from "../../../apps/server/src/game-usecases/loot-manager";
import { dungeonRouter } from "../../../apps/server/src/routers/dungeon-router";
import type { Context } from "../../../apps/server/src/lib/context";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
beforeEach(async () => { data = await database(); });
afterEach(async () => { await data?.close(); });
const party = [{ id: "audit-hero", health: 37, mana: 9, dead: false }];
const fallenParty = [{ id: "audit-hero", health: 0, mana: 9, dead: true }];
const dungeon = () => dungeonManager.getDungeon("audit-dungeon", data.db);
const loot = () => new LootManager("audit-owner", data.db).getLoot();
async function attempt(battleId: string, round: number) {
  await data.db.insert(TB_dungeonBattle).values({ dungeonId: "audit-dungeon", battleId, round });
  await data.db.update(TB_dungeonData).set({ activeBattle: true }).where(eq(TB_dungeonData.id, "audit-dungeon"));
}
const complete = (battleId: string, winner: "TEAM_A" | "TEAM_B") =>
  dungeonManager.handleDungeonCleared("audit-dungeon", battleId, [new Goblin("audit-goblin")],
    winner === "TEAM_A" ? party : fallenParty, winner, data.db);

describe("dungeon attempts, resources and completion identity", () => {
  test("saved HP and mana survive dungeon-to-battle creation", async () => {
    const initial = await dungeon();
    expect([initial.playerTeam[0]!.health, initial.playerTeam[0]!.mana]).toEqual([37, 9]);
    const factory = new SyncFactory(data.db);
    await factory.add("attrition", initial.playerTeam, initial.actualEnemies[0]!);
    const restored = await factory.get("attrition");
    expect([restored.characters[0]!.health, restored.characters[0]!.mana]).toEqual([37, 9]);
  });

  for (const losses of [1, 2, 3]) {
    test(`${losses} lost attempts followed by a win advance exactly one wave`, async () => {
      for (let i = 0; i < losses; i++) {
        await attempt(`loss-${i}`, 0);
        await complete(`loss-${i}`, "TEAM_B");
        expect((await dungeon()).round).toBe(0);
      }
      await attempt("win", 0);
      await complete("win", "TEAM_A");
      expect((await dungeon()).round).toBe(1);
    });
  }

  for (const winner of ["TEAM_A", "TEAM_B"] as const) {
    test(`${winner}: repeating completion preserves both progression and rewards`, async () => {
      await attempt("completed", 0);
      await complete("completed", winner);
      const firstLoot = await loot();
      const firstRound = (await dungeon()).round;
      expect(firstLoot).toHaveLength(1);
      await complete("completed", winner);
      expect(await loot()).toEqual(firstLoot);
      expect((await dungeon()).round).toBe(firstRound);
    });
  }

  test("an old completion cannot advance, clear or reward a newer active attempt", async () => {
    await attempt("old", 0);
    await complete("old", "TEAM_A");
    const firstLoot = await loot();
    await attempt("current", 1);
    await complete("old", "TEAM_A");
    const state = await dungeon();
    expect({ round: state.round, activeBattle: state.activeBattle }).toEqual({ round: 1, activeBattle: true });
    expect(await loot()).toEqual(firstLoot);
  });

  test("reward write failure rolls back progression and XP; retry completes once", async () => {
    await attempt("retry", 0);
    const before = await dungeon();
    await data.failWrites("loot");
    await expect(complete("retry", "TEAM_A")).rejects.toThrow();
    const failed = await dungeon();
    expect([failed.round, failed.activeBattle, failed.playerTeam[0]!.xp])
      .toEqual([before.round, before.activeBattle, before.playerTeam[0]!.xp]);
    expect(await loot()).toEqual([]);
    await data.allowWrites("loot");
    await complete("retry", "TEAM_A");
    expect((await dungeon()).round).toBe(1);
    expect(await loot()).toHaveLength(1);
  });

  test("dungeon reads and completions are scoped to the requested dungeon", async () => {
    await data.db.insert(TB_dungeonData).values({
      id: "unrelated", key: "dungeon1", createdBy: "audit-owner", round: 2,
    });
    await data.db.insert(TB_dungeonBattle).values({ dungeonId: "unrelated", battleId: "other-battle", round: 2 });
    await attempt("own-battle", 0);
    await complete("own-battle", "TEAM_A");
    expect((await dungeon()).round).toBe(1);
    expect((await dungeonManager.getDungeon("unrelated", data.db)).round).toBe(2);
    expect((await dungeonManager.getDungeonBattles("audit-dungeon", data.db)).map((b) => b.battleId)).toEqual(["own-battle"]);
  });

  test("overlapping start requests create at most one active battle", async () => {
    const caller = dungeonRouter.createCaller({ db: data.db, session: { id: "audit-owner" } } as unknown as Context);
    const attempts = await Promise.allSettled([
      caller.fightDungeon({ id: "audit-dungeon" }),
      caller.fightDungeon({ id: "audit-dungeon" }),
    ]);
    const acceptedIds = attempts.flatMap((a) => a.status === "fulfilled" ? [a.value] : []);
    expect(acceptedIds.length).toBeGreaterThan(0);
    expect(new Set(acceptedIds).size, "a duplicate request may reject or return the same battle").toBe(1);
    expect(await dungeonManager.getDungeonBattles("audit-dungeon", data.db)).toHaveLength(1);
    expect((await dungeon()).activeBattle).toBe(true);
  });
});
