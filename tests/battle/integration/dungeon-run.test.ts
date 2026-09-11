import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { BM } from "../../../apps/game/src/bm";
import {
  advanceBots,
  castBattleSpell,
  getBattleTargets,
} from "../../../apps/server/src/battle/commands";
import {
  TB_character,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_equipmentStats,
  TB_loot,
  TB_spellStats,
  TB_user,
} from "../../../apps/server/src/db/schema";
import { bmStorage } from "../../../apps/server/src/game-usecases/bm-storage";
import {
  equipSpell,
  equipEquipment,
  unequipSpell,
} from "../../../apps/server/src/game-usecases/character";
import { dungeonManager } from "../../../apps/server/src/game-usecases/dungeon-manager";
import {
  getDungeonBattleContext,
  getDungeonRun,
} from "../../../apps/server/src/game-usecases/dungeon-run";
import { EntityFactory } from "../../../apps/server/src/game-usecases/entity-factory";
import { LootManager } from "../../../apps/server/src/game-usecases/loot-manager";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { dungeonRouter } from "../../../apps/server/src/routers/dungeon-router";
import type { Context } from "../../../apps/server/src/lib/context";
import { registerRecipes } from "../../../apps/server/src/lib/superjson-recipes";
import { database, type TestDatabase } from "../support/database";

registerRecipes();
let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});
const owner = "audit-owner";
const caller = () =>
  dungeonRouter.createCaller({
    db: data.db,
    session: { id: owner },
  } as unknown as Context);

describe("the complete dungeon run", () => {
  test("five real forest waves persist resources, results and rewards; claimed spells equip into the next run", async () => {
    // A veteran fixture keeps this progression test independent of balance.
    await data.db
      .update(TB_character)
      .set({
        health: 2000,
        mana: 1000,
        vitality: 200,
        intelligence: 200,
        strength: 200,
        level: 20,
      })
      .where(eq(TB_character.id, "audit-hero"));
    await data.db.insert(TB_spellStats).values({
      id: "fixture-offensive",
      type: "bladestorm-rhythm",
      userId: owner,
      equippedBy: "audit-hero",
    });
    const entered = await caller().enterDungeon({
      key: "trial-of-the-nature",
      characters: ["audit-hero"],
    });
    let expectedResources = [2000, 1000];
    for (let wave = 0; wave < 5; wave++) {
      const run = await getDungeonRun(entered.id, owner, data.db);
      expect(run.round).toBe(wave);
      expect([run.playerTeam[0]!.health, run.playerTeam[0]!.mana]).toEqual(
        expectedResources,
      );
      const battleId = await caller().fightDungeon({ id: entered.id });
      const resumed = await getDungeonRun(entered.id, owner, data.db);
      expect(resumed.activeBattleId).toBe(battleId);
      expect(resumed.activeBattle).toBe(true);
      expect(
        (await getDungeonBattleContext(battleId, owner, data.db))?.attempt
          .completedAt,
      ).toBeNull();
      const snapshot = await new SyncFactory(data.db).get(battleId);
      const bm = new BM(
        [...snapshot.characters, ...snapshot.enemies],
        battleId,
      );
      bm.start();
      for (let turn = 0; !bm.isGameOver() && turn < 200; turn++) {
        const hero = bm.getEntityById(bm.getCurrentRound().orderQueue[0]!)!;
        const spell =
          hero.spells.find(
            (spell) =>
              spell.config.type === "bladestorm-rhythm" && spell.canCast(hero),
          ) ??
          hero.spells.find((spell) => spell.config.type === "basic-attack")!;
        const command = { entityId: hero.id, spellId: spell.config.id };
        const targets = getBattleTargets(bm, command);
        castBattleSpell(
          bm,
          {
            ...command,
            targetIds: targets.automatic
              ? targets.targets
              : [targets.targets[0]!],
          },
          owner,
        );
      }
      expect(
        bm.getWinningTeam(),
        `Wave ${wave + 1}: ${bm.entities.map((e) => `${e.name} ${e.health} HP`).join(", ")}`,
      ).toBe("TEAM_A");
      await bmStorage.save(bm, data.db);
      const result = await bmStorage.get(battleId, data.db);
      const deadEnemies = result.teamB
        .filter((enemy) => enemy.dead)
        .map((enemy) =>
          EntityFactory.createEnemyFromType(enemy.type, enemy.id),
        );
      await dungeonManager.handleDungeonCleared(
        entered.id,
        battleId,
        deadEnemies,
        result.teamA,
        result.winner,
        data.db,
      );
      const after = await getDungeonBattleContext(battleId, owner, data.db);
      expect(after?.run.round).toBe(wave + 1);
      expect(after?.run.activeBattleId).toBeNull();
      expect(after?.xpAwards[0]?.xp).toBe(
        deadEnemies.reduce((total, enemy) => total + enemy.xp, 0),
      );
      expect(after?.run.loot).toHaveLength(wave + 1);
      expectedResources = [result.teamA[0]!.health, result.teamA[0]!.mana];
    }
    const finished = await getDungeonRun(entered.id, owner, data.db);
    expect(finished.cleared).toBe(true);
    expect(finished.battles.map((battle) => battle.round)).toEqual([
      0, 1, 2, 3, 4,
    ]);
    await expect(caller().fightDungeon({ id: entered.id })).rejects.toThrow();
    const bossReward = finished.loot.find(
      (reward) => reward.battleId === finished.battles.at(-1)!.battleId,
    )!;
    expect(
      bossReward.items.some(
        (item) =>
          item.type === "SPELL" && item.data.spellType === "natures-embrace",
      ),
    ).toBe(true);
    await new LootManager(owner, data.db).claim(bossReward.id);
    const [staff] = await data.db.select().from(TB_equipmentStats)
      .where(eq(TB_equipmentStats.type, "oakwarden-staff"));
    expect(staff).toBeDefined();
    await equipEquipment("audit-hero", staff!.id, owner, data.db);
    const [spell] = await data.db
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.type, "natures-embrace"));
    await equipSpell("audit-hero", spell!.id, owner, data.db);
    const next = await caller().enterDungeon({
      key: "trial-of-the-nature",
      characters: ["audit-hero"],
    });
    expect(next.id).not.toBe(entered.id);
    expect(next.round).toBe(0);
    expect(next.playerTeam[0]!.equipped.WEAPON?.itemType).toBe("oakwarden-staff");
    expect(
      next.playerTeam[0]!.spells.some(
        (equipped) => equipped.config.id === spell!.id,
      ),
    ).toBe(true);
    const hero = await EntityFactory.createCharacter("audit-hero", data.db);
    expect([next.playerTeam[0]!.health, next.playerTeam[0]!.mana]).toEqual([
      hero.health,
      hero.mana,
    ]);
  });

  test("defeat persists the fallen party, awards no survivor XP, and permits a fresh expedition", async () => {
    await data.db
      .update(TB_character)
      .set({ health: 1, vitality: 1, agility: 0 })
      .where(eq(TB_character.id, "audit-hero"));
    const run = await caller().enterDungeon({
      key: "trial-of-the-nature",
      characters: ["audit-hero"],
    });
    const battleId = await caller().fightDungeon({ id: run.id });
    const snapshot = await new SyncFactory(data.db).get(battleId);
    const bm = new BM([...snapshot.characters, ...snapshot.enemies], battleId);
    bm.start();
    advanceBots(bm);
    expect(bm.getWinningTeam()).toBe("TEAM_B");
    await bmStorage.save(bm, data.db);
    const result = await bmStorage.get(battleId, data.db);
    await dungeonManager.handleDungeonCleared(
      run.id,
      battleId,
      [],
      result.teamA,
      result.winner,
      data.db,
    );
    const context = await getDungeonBattleContext(battleId, owner, data.db);
    expect(context?.run.round).toBe(0);
    expect(context?.run.cleared).toBe(false);
    expect(context?.run.activeBattleId).toBeNull();
    expect(context?.run.playerTeam[0]!.health).toBe(0);
    expect(context?.xpAwards).toEqual([{ characterId: "audit-hero", xp: 0 }]);
    await expect(caller().fightDungeon({ id: run.id })).rejects.toThrow(
      "party has fallen",
    );
    const retry = await caller().enterDungeon({
      key: "trial-of-the-nature",
      characters: ["audit-hero"],
    });
    expect(retry.id).not.toBe(run.id);
    expect(retry.playerTeam[0]!.health).toBe(1);
  });

  test("rejects empty and duplicate parties and starting with a fallen party", async () => {
    await expect(
      caller().enterDungeon({ key: "trial-of-the-nature", characters: [] }),
    ).rejects.toThrow();
    await expect(
      caller().enterDungeon({
        key: "trial-of-the-nature",
        characters: ["audit-hero", "audit-hero"],
      }),
    ).rejects.toThrow();
    await data.db
      .update(TB_dungeonData)
      .set({
        characterData: [{ characterId: "audit-hero", health: 0, mana: 9 }],
      })
      .where(eq(TB_dungeonData.id, "audit-dungeon"));
    await expect(
      caller().fightDungeon({ id: "audit-dungeon" }),
    ).rejects.toThrow("party has fallen");
    expect(
      (await getDungeonRun("audit-dungeon", owner, data.db)).activeBattle,
    ).toBe(false);
    expect(await data.db.select().from(TB_dungeonBattle)).toHaveLength(0);
  });

  test("run context never returns another player's loot or an unrelated party", async () => {
    await data.db.insert(TB_user).values({ id: "other-owner" });
    await data.db.insert(TB_dungeonBattle).values({
      dungeonId: "audit-dungeon",
      battleId: "shared-battle",
      round: 0,
    });
    await data.db.insert(TB_loot).values([
      { battleId: "shared-battle", userId: owner, gold: 0, items: [] },
      { battleId: "shared-battle", userId: "other-owner", gold: 0, items: [] },
    ]);
    const run = await getDungeonRun("audit-dungeon", owner, data.db);
    expect(run.loot.map((loot) => loot.userId)).toEqual([owner]);
    await expect(
      getDungeonRun("audit-dungeon", "other-owner", data.db),
    ).rejects.toThrow("another party");
    await expect(
      getDungeonBattleContext("shared-battle", "other-owner", data.db),
    ).rejects.toThrow("another party");
  });
});

describe("reward collection and spell ownership", () => {
  test("overlapping claims can create only one copy of a dropped spell", async () => {
    await data.db.insert(TB_loot).values({
      id: "drop",
      battleId: "reward",
      userId: owner,
      gold: 0,
      items: [
        { type: "SPELL", data: { spellType: "single-heal" }, dropRate: 1 },
      ],
    });
    const results = await Promise.allSettled([
      new LootManager(owner, data.db).claim("drop"),
      new LootManager(owner, data.db).claim("drop"),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await data.db.select().from(TB_spellStats)).toHaveLength(1);
  });

  test("spells and target character must belong to the requester; four slots remain a hard limit", async () => {
    await data.db.insert(TB_user).values({ id: "other-owner" });
    await data.db.insert(TB_spellStats).values(
      Array.from({ length: 6 }, (_, index) => ({
        id: `spell-${index}`,
        type: "single-heal" as const,
        userId: index === 5 ? "other-owner" : owner,
      })),
    );
    await expect(
      equipSpell("audit-hero", "spell-5", owner, data.db),
    ).rejects.toThrow("your collection");
    await expect(
      equipSpell("audit-hero", "spell-5", "other-owner", data.db),
    ).rejects.toThrow("Not your character");
    const requests = await Promise.allSettled(
      Array.from({ length: 5 }, (_, index) =>
        equipSpell("audit-hero", `spell-${index}`, owner, data.db),
      ),
    );
    expect(
      requests.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(4);
    const equipped = await data.db
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.equippedBy, "audit-hero"));
    expect(equipped).toHaveLength(4);
    await unequipSpell(equipped[0]!.id, "other-owner", data.db);
    expect(
      await data.db
        .select()
        .from(TB_spellStats)
        .where(eq(TB_spellStats.equippedBy, "audit-hero")),
    ).toHaveLength(4);
    await unequipSpell(equipped[0]!.id, owner, data.db);
    expect(
      await data.db
        .select()
        .from(TB_spellStats)
        .where(eq(TB_spellStats.equippedBy, "audit-hero")),
    ).toHaveLength(3);
  });
});
