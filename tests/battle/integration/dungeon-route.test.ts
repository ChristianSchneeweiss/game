import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import seedrandom from "seedrandom";
import { BM } from "../../../apps/game/src/bm";
import {
  routeRewards,
  routeRules,
  type RouteAction,
} from "../../../apps/game/src/dungeons/route";
import {
  rollDungeonRoute,
  routeEncounterCatalog,
} from "../../../apps/game/src/dungeons/route-catalog";
import {
  advanceBots,
  castBattleSpell,
  getBattleTargets,
} from "../../../apps/server/src/battle/commands";
import {
  TB_character,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_dungeonEnemy,
  TB_dungeonParticipant,
  TB_equipmentStats,
  TB_loot,
  TB_spellStats,
  TB_user,
} from "../../../apps/server/src/db/schema";
import { bmStorage } from "../../../apps/server/src/game-usecases/bm-storage";
import { dungeonManager } from "../../../apps/server/src/game-usecases/dungeon-manager";
import { getDungeonRun } from "../../../apps/server/src/game-usecases/dungeon-run";
import { EntityFactory } from "../../../apps/server/src/game-usecases/entity-factory";
import { LootManager } from "../../../apps/server/src/game-usecases/loot-manager";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { dungeonRouter } from "../../../apps/server/src/routers/dungeon-router";
import type { Context } from "../../../apps/server/src/lib/context";
import { registerRecipes } from "../../../apps/server/src/lib/superjson-recipes";
import { database, type TestDatabase } from "../support/database";

registerRecipes();
let data: TestDatabase;
const owner = "audit-owner";
const caller = (userId = owner) =>
  dungeonRouter.createCaller({
    db: data.db,
    session: { id: userId },
  } as unknown as Context);
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

async function forkFixture(
  action: RouteAction,
  resources = { health: 37, mana: 9 },
  wave = 1,
) {
  // A saved mid-run fixture supplies the requested room; generation is tested separately.
  const catalog = routeEncounterCatalog.filter((entry) =>
    entry.actions.includes(action),
  );
  const route = rollDungeonRoute(wave + 1, seedrandom("fixture"), catalog);
  await data.db
    .update(TB_dungeonData)
    .set({
      key: "trial-of-the-nature",
      round: wave,
      route,
      characterData: [{ characterId: "audit-hero", ...resources }],
    })
    .where(eq(TB_dungeonData.id, "audit-dungeon"));
  await data.db
    .insert(TB_dungeonEnemy)
    .values(
      [1, 2, 3, 4].map((round) => ({
        id: `fork-enemy-${round}`,
        dungeonId: "audit-dungeon",
        type: "goblin" as const,
        inRound: round,
      })),
    )
    .onConflictDoNothing();
  return {
    id: "audit-dungeon",
    wave,
    offerId: route.forks.find((fork) => fork.wave === wave)!.offers[0]!.id,
    action,
  };
}

describe("persisted path decisions", () => {
  test("new routes survive reloads and gates cannot be skipped or chosen out of order", async () => {
    const entered = await caller().enterDungeon({
      key: "trial-of-the-nature",
      characters: ["audit-hero"],
      branching: true,
    });
    expect(entered.route?.forks).toHaveLength(4);
    expect((await getDungeonRun(entered.id, owner, data.db)).route).toEqual(
      entered.route,
    );
    const offer = entered.route!.forks[0]!.offers[0]!;
    await expect(
      caller().choosePath({
        id: entered.id,
        wave: 1,
        offerId: offer.id,
        action: offer.encounter.actions[0]!,
      }),
    ).rejects.toThrow("after clearing");
    const choice = await forkFixture("restore-health");
    await expect(caller().fightDungeon({ id: choice.id })).rejects.toThrow(
      "Choose your path",
    );
    expect((await getDungeonRun(choice.id, owner, data.db)).activeBattle).toBe(
      false,
    );
    expect(await data.db.select().from(TB_dungeonBattle)).toHaveLength(0);
    await expect(caller("outsider").choosePath(choice)).rejects.toThrow(
      "Only this party",
    );
    await expect(
      caller().choosePath({ ...choice, action: "elite" }),
    ).rejects.toThrow("offered paths");
    await expect(
      caller().choosePath({ ...choice, offerId: "not-offered" }),
    ).rejects.toThrow("offered paths");
    await data.db
      .update(TB_dungeonData)
      .set({ activeBattle: true })
      .where(eq(TB_dungeonData.id, choice.id));
    await expect(caller().choosePath(choice)).rejects.toThrow("after clearing");
  });

  test("shrine recovery is capped, never revives, and concurrent retries cannot heal twice", async () => {
    const choice = await forkFixture("restore-health", {
      health: 85,
      mana: 45,
    });
    await data.db.insert(TB_character).values({
      id: "fallen",
      userId: owner,
      name: "Fallen",
      health: 100,
      mana: 50,
      intelligence: 20,
      vitality: 10,
      strength: 18,
      agility: 10,
    });
    await data.db
      .insert(TB_dungeonParticipant)
      .values({ dungeonId: choice.id, characterId: "fallen" });
    await data.db
      .update(TB_dungeonData)
      .set({
        characterData: [
          { characterId: "audit-hero", health: 85, mana: 45 },
          { characterId: "fallen", health: 0, mana: 0 },
        ],
      })
      .where(eq(TB_dungeonData.id, choice.id));
    const results = await Promise.all([
      caller().choosePath(choice),
      caller().choosePath(choice),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0]!.resources).toEqual([
      { characterId: "audit-hero", health: 15, mana: 0 },
    ]);
    const run = await getDungeonRun(choice.id, owner, data.db);
    expect(run.route!.decisions).toHaveLength(1);
    expect(run.route!.forks).toHaveLength(1);
    expect(run.playerTeam.map((hero) => [hero.health, hero.mana])).toEqual([
      [100, 45],
      [0, 0],
    ]);
    await expect(
      caller().choosePath({ ...choice, action: "restore-mana" }),
    ).rejects.toThrow("already chosen");
  });

  test("mana blessing restores only the missing amount", async () => {
    const choice = await forkFixture("restore-mana", { health: 85, mana: 45 });
    expect((await caller().choosePath(choice)).resources).toEqual([
      { characterId: "audit-hero", health: 0, mana: 5 },
    ]);
  });

  test("treasure rewards and decisions roll back together, then claim once per participant owner", async () => {
    const choice = await forkFixture("take-treasure");
    await data.db.insert(TB_user).values({ id: "guest-owner" });
    await data.db.insert(TB_character).values({
      id: "guest",
      userId: "guest-owner",
      name: "Guest",
      health: 100,
      mana: 50,
      intelligence: 20,
      vitality: 10,
      strength: 18,
      agility: 10,
    });
    await data.db
      .insert(TB_dungeonParticipant)
      .values({ dungeonId: choice.id, characterId: "guest" });
    await data.db
      .update(TB_dungeonData)
      .set({
        characterData: [
          { characterId: "audit-hero", health: 37, mana: 9 },
          { characterId: "guest", health: 50, mana: 20 },
        ],
      })
      .where(eq(TB_dungeonData.id, choice.id));
    await data.failWrites("loot");
    await expect(caller().choosePath(choice)).rejects.toThrow();
    expect(
      (await getDungeonRun(choice.id, owner, data.db)).route!.decisions,
    ).toHaveLength(0);
    await data.allowWrites("loot");
    await caller("guest-owner").choosePath(choice);
    const ownRun = await getDungeonRun(choice.id, owner, data.db);
    const guestRun = await getDungeonRun(choice.id, "guest-owner", data.db);
    expect(ownRun.loot).toHaveLength(1);
    expect(guestRun.loot).toHaveLength(1);
    expect(ownRun.loot[0]!.userId).toBe(owner);
    await new LootManager(owner, data.db).claim(ownRun.loot[0]!.id);
    await caller().choosePath(choice);
    expect((await getDungeonRun(choice.id, owner, data.db)).loot).toHaveLength(
      0,
    );
    expect(await data.db.select().from(TB_equipmentStats)).toHaveLength(1);
    expect(
      (await getDungeonRun(choice.id, "guest-owner", data.db)).loot,
    ).toHaveLength(1);
    await expect(
      caller().choosePath({ ...choice, action: "gamble-treasure" }),
    ).rejects.toThrow("already chosen");
  });

  test("a seeded gamble cannot reroll and a trap leaves survivors at one HP", async () => {
    const outcomes = new Set<string>();
    for (let wave = 1; wave < 5; wave++) {
      const choice = await forkFixture(
        "gamble-treasure",
        { health: 2, mana: 9 },
        wave,
      );
      const expectedWin =
        seedrandom(`${choice.id}:treasure:${wave}`)() < routeRules.gambleChance;
      const decision = await caller().choosePath(choice);
      outcomes.add(decision.outcome);
      expect(decision.outcome).toBe(expectedWin ? "treasure" : "trap");
      expect(await caller().choosePath(choice)).toEqual(decision);
      const run = await getDungeonRun(choice.id, owner, data.db);
      expect(run.playerTeam[0]!.health).toBe(expectedWin ? 2 : 1);
      expect(decision.rewards).toEqual(
        expectedWin ? [routeRewards(wave).rareReward] : [],
      );
    }
    expect(outcomes).toEqual(new Set(["treasure", "trap"]));
  });

  test("the ancient vault grants only one piece of gear, exactly once", async () => {
    const choice = await forkFixture("open-vault");
    const result = await caller().choosePath(choice);
    expect(result.rewards).toEqual(["iron-cuirass"]);
    await caller().choosePath(choice);
    expect((await getDungeonRun(choice.id, owner, data.db)).loot).toHaveLength(
      1,
    );
  });

  test("fallen and completed parties cannot take a new path; legacy runs stay linear", async () => {
    const choice = await forkFixture("continue", { health: 0, mana: 0 });
    await expect(caller().choosePath(choice)).rejects.toThrow(
      "party has fallen",
    );
    await data.db
      .update(TB_dungeonData)
      .set({ cleared: true })
      .where(eq(TB_dungeonData.id, choice.id));
    await expect(caller().choosePath(choice)).rejects.toThrow("after clearing");
    await data.db
      .update(TB_dungeonData)
      .set({ cleared: false, route: null })
      .where(eq(TB_dungeonData.id, choice.id));
    await expect(caller().choosePath(choice)).rejects.toThrow("original route");
  });
});

async function winBattle(runId: string) {
  const battleId = await caller().fightDungeon({ id: runId });
  const snapshot = await new SyncFactory(data.db).get(battleId);
  const bm = new BM([...snapshot.characters, ...snapshot.enemies], battleId);
  bm.start();
  for (let turn = 0; !bm.isGameOver() && turn < 200; turn++) {
    const hero = bm.getEntityById(bm.getCurrentRound().orderQueue[0]!)!;
    const spell =
      hero.spells.find(
        (spell) =>
          spell.config.type === "bladestorm-rhythm" && spell.canCast(hero),
      ) ?? hero.spells.find((spell) => spell.config.type === "basic-attack")!;
    const command = { entityId: hero.id, spellId: spell.config.id };
    const targets = getBattleTargets(bm, command);
    castBattleSpell(
      bm,
      {
        ...command,
        targetIds: targets.automatic ? targets.targets : [targets.targets[0]!],
      },
      owner,
    );
  }
  expect(bm.getWinningTeam()).toBe("TEAM_A");
  await bmStorage.save(bm, data.db);
  const result = await bmStorage.get(battleId, data.db);
  const defeated = result.teamB
    .filter((enemy) => enemy.dead)
    .map((enemy) => EntityFactory.createEnemyFromType(enemy.type, enemy.id));
  const finish = () =>
    dungeonManager.handleDungeonCleared(
      runId,
      battleId,
      defeated,
      result.teamA,
      result.winner,
      data.db,
    );
  await finish();
  return { battleId, snapshot, result, finish };
}

test("a complete branching run freezes elite builds, rewards real victories once, and preserves every decision", async () => {
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
    id: "offensive",
    type: "bladestorm-rhythm",
    userId: owner,
    equippedBy: "audit-hero",
  });
  const run = await caller().enterDungeon({
    key: "trial-of-the-nature",
    characters: ["audit-hero"],
    branching: true,
  });
  const route = rollDungeonRoute(
    5,
    seedrandom("elite-run"),
    routeEncounterCatalog.filter((entry) => entry.kind === "elite"),
  );
  await data.db
    .update(TB_dungeonData)
    .set({ route })
    .where(eq(TB_dungeonData.id, run.id));
  for (let wave = 0; wave < 5; wave++) {
    const before = await getDungeonRun(run.id, owner, data.db);
    if (wave > 0) {
      await expect(caller().fightDungeon({ id: run.id })).rejects.toThrow(
        "Choose your path",
      );
      await caller().choosePath({
        id: run.id,
        wave,
        offerId: route.forks[wave - 1]!.offers[0]!.id,
        action: "elite",
      });
    }
    const { battleId, snapshot, result, finish } = await winBattle(run.id);
    if (wave > 0) {
      for (const enemy of snapshot.enemies) {
        const base = before.actualEnemies[wave]!.find(
          (entry) => entry.id === enemy.id,
        )!;
        expect(enemy.maxHealth).toBe(
          Math.ceil(base.maxHealth * routeRules.eliteHealth),
        );
        expect(enemy.baseAttributes.strength).toBe(
          Math.ceil(base.baseAttributes.strength * routeRules.eliteAttributes),
        );
        expect(enemy.name).toStartWith("Elite ");
      }
      const frozen = await new SyncFactory(data.db).get(battleId);
      expect(frozen.enemies[0]!.maxHealth).toBe(snapshot.enemies[0]!.maxHealth);
      expect(frozen.enemies[0]!.name).toStartWith("Elite ");
      const after = await getDungeonRun(run.id, owner, data.db);
      const rewards = after.loot.find(
        (reward) => reward.battleId === battleId,
      )!;
      const rng = seedrandom(battleId);
      const expected: typeof rewards.items = [];
      for (const enemy of result.teamB.filter((enemy) => enemy.dead)) {
        const base = EntityFactory.createEnemyFromType(enemy.type, enemy.id);
        expected.push(
          ...(await new LootManager(owner, data.db).drop(rng, base.loot)),
        );
      }
      if (
        seedrandom(`${run.id}:elite:${wave}`)() < routeRules.eliteRewardChance
      )
        expected.push({
          type: "ITEM",
          data: { itemType: routeRewards(wave).rareReward },
          dropRate: 1,
        });
      expect(rewards.items).toEqual(expected);
      await finish();
      expect(
        (await getDungeonRun(run.id, owner, data.db)).loot.filter(
          (reward) => reward.battleId === battleId,
        ),
      ).toHaveLength(1);
    }
  }
  const finished = await getDungeonRun(run.id, owner, data.db);
  expect(finished.cleared).toBe(true);
  expect(finished.route!.forks).toEqual(route.forks);
  expect(finished.route!.decisions).toHaveLength(4);
});

test("losing an elite encounter does not grant its victory bonus", async () => {
  const choice = await forkFixture("elite", { health: 1, mana: 0 });
  await data.db
    .update(TB_character)
    .set({ agility: 0 })
    .where(eq(TB_character.id, "audit-hero"));
  await caller().choosePath(choice);
  const battleId = await caller().fightDungeon({ id: choice.id });
  const snapshot = await new SyncFactory(data.db).get(battleId);
  const bm = new BM([...snapshot.characters, ...snapshot.enemies], battleId);
  bm.start();
  advanceBots(bm);
  expect(bm.getWinningTeam()).toBe("TEAM_B");
  await bmStorage.save(bm, data.db);
  const result = await bmStorage.get(battleId, data.db);
  await dungeonManager.handleDungeonCleared(
    choice.id,
    battleId,
    [],
    result.teamA,
    result.winner,
    data.db,
  );
  const run = await getDungeonRun(choice.id, owner, data.db);
  expect(run.round).toBe(1);
  expect(run.playerTeam[0]!.health).toBe(0);
  expect(run.loot.flatMap((loot) => loot.items)).toEqual([]);
});

test("elite bonuses can miss, and completion retries never reroll or duplicate them", async () => {
  for (const [wave, expectedItems] of [
    [1, 1],
    [4, 0],
  ] as const) {
    const choice = await forkFixture("elite", undefined, wave);
    const decision = await caller().choosePath(choice);
    expect(decision.eliteRewardChance).toBe(0.5);
    const battleId = `bonus-${wave}`;
    await data.db
      .insert(TB_dungeonBattle)
      .values({ dungeonId: choice.id, battleId, round: wave });
    await data.db
      .update(TB_dungeonData)
      .set({ activeBattle: true, activeBattleId: battleId })
      .where(eq(TB_dungeonData.id, choice.id));
    const finish = () =>
      dungeonManager.handleDungeonCleared(
        choice.id,
        battleId,
        [],
        [{ id: "audit-hero", health: 37, mana: 9, dead: false }],
        "TEAM_A",
        data.db,
      );
    await finish();
    const loot = await data.db
      .select()
      .from(TB_loot)
      .where(eq(TB_loot.battleId, battleId));
    expect(loot).toHaveLength(1);
    expect(loot[0]!.items).toHaveLength(expectedItems);
    await finish();
    expect(
      await data.db
        .select()
        .from(TB_loot)
        .where(eq(TB_loot.battleId, battleId)),
    ).toEqual(loot);
  }
});

test("an already chosen elite path keeps its previously guaranteed reward", async () => {
  // This fork's roll misses the new 50% chance, but predates the balance change.
  const choice = await forkFixture("elite", undefined, 4);
  const run = await getDungeonRun(choice.id, owner, data.db);
  await data.db
    .update(TB_dungeonData)
    .set({
      route: {
        ...run.route!,
        decisions: [
          {
            wave: 4,
            offerId: choice.offerId,
            action: "elite",
            outcome: "elite",
            resources: [],
            rewards: [],
          },
        ],
      },
      activeBattle: true,
      activeBattleId: "legacy-elite",
    })
    .where(eq(TB_dungeonData.id, choice.id));
  await data.db
    .insert(TB_dungeonBattle)
    .values({ dungeonId: choice.id, battleId: "legacy-elite", round: 4 });
  await dungeonManager.handleDungeonCleared(
    choice.id,
    "legacy-elite",
    [],
    [{ id: "audit-hero", health: 37, mana: 9, dead: false }],
    "TEAM_A",
    data.db,
  );
  const [loot] = await data.db
    .select()
    .from(TB_loot)
    .where(eq(TB_loot.battleId, "legacy-elite"));
  expect(loot!.items).toEqual([
    { type: "ITEM", data: { itemType: "oakwarden-staff" }, dropRate: 1 },
  ]);
});
