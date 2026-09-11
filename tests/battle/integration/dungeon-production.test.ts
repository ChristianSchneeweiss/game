import { afterEach, beforeEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import seedrandom from "seedrandom";
import SuperJSON from "superjson";
import { dungeonRunPhase } from "../../../apps/game/src/dungeons/run-state";
import { readDungeonRoute } from "../../../apps/game/src/dungeons/route-state";
import { rollDungeonRoute } from "../../../apps/game/src/dungeons/route-catalog";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import {
  decodeStartingBuilds,
  deserializeStartingBuilds,
  serializeStartingBuilds,
} from "../../../apps/server/src/battle/starting-build-codec";
import {
  captureStartingBuilds,
  restoreStartingBuilds,
} from "../../../apps/server/src/battle/starting-builds";
import {
  TB_battleStart,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_dungeonParticipant,
  TB_loot,
} from "../../../apps/server/src/db/schema";
import { beginDungeonAttempt } from "../../../apps/server/src/game-usecases/dungeon-attempt";
import { dungeonManager } from "../../../apps/server/src/game-usecases/dungeon-manager";
import { getDungeonRun } from "../../../apps/server/src/game-usecases/dungeon-run";
import { chooseDungeonPath } from "../../../apps/server/src/game-usecases/dungeon-route";
import { EntityFactory } from "../../../apps/server/src/game-usecases/entity-factory";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

test("saved route v1 and linear runs retain their contracts; future and malformed versions fail before writes", async () => {
  const route = rollDungeonRoute(5, seedrandom("compatibility"));
  expect(readDungeonRoute(null)).toBeNull();
  expect(readDungeonRoute(route)).toEqual(route);
  expect(() => readDungeonRoute({ ...route, version: 2 })).toThrow(
    "Unsupported",
  );
  expect(() =>
    readDungeonRoute({ ...route, forks: [{ wave: 1, offers: [] }] }),
  ).toThrow("Invalid");
  await data.db
    .update(TB_dungeonData)
    .set({ route: sql`${JSON.stringify({ ...route, version: 2 })}::json` })
    .where(eq(TB_dungeonData.id, "audit-dungeon"));
  await expect(
    getDungeonRun("audit-dungeon", "audit-owner", data.db),
  ).rejects.toThrow("Unsupported");
  await expect(
    beginDungeonAttempt("audit-dungeon", "audit-owner", data.db),
  ).rejects.toThrow("Unsupported");
  await expect(
    chooseDungeonPath(
      "audit-dungeon",
      1,
      route.forks[0]!.offers[0]!.id,
      "continue",
      "audit-owner",
      data.db,
    ),
  ).rejects.toThrow("Unsupported");
  const [record] = await data.db.select().from(TB_dungeonData);
  expect(record!.activeBattle).toBe(false);
  expect(record!.characterData).toEqual([
    { characterId: "audit-hero", health: 37, mana: 9 },
  ]);
  expect(await data.db.select().from(TB_dungeonBattle)).toHaveLength(0);
  expect(await data.db.select().from(TB_loot)).toHaveLength(0);
});

test("the derived state distinguishes preparation, fights, choices, next wave, completion and defeat", () => {
  const run = {
    cleared: false,
    activeBattle: false,
    round: 0,
    totalWaves: 5,
    resources: [{ health: 37 }],
  };
  expect(dungeonRunPhase(run)).toBe("prepared");
  expect(dungeonRunPhase({ ...run, activeBattle: true })).toBe("fighting");
  expect(dungeonRunPhase({ ...run, round: 1 })).toBe("ready");
  expect(
    dungeonRunPhase({
      ...run,
      round: 1,
      route: rollDungeonRoute(5, seedrandom("state")),
    }),
  ).toBe("awaiting-choice");
  expect(dungeonRunPhase({ ...run, cleared: true })).toBe("complete");
  expect(dungeonRunPhase({ ...run, resources: [{ health: 0 }] })).toBe(
    "defeated",
  );
  expect(dungeonRunPhase({ ...run, resources: [] })).toBe("defeated");
});

test("an active run cannot be removed or lose its completion obligation", async () => {
  const battleId = await beginDungeonAttempt(
    "audit-dungeon",
    "audit-owner",
    data.db,
  );
  await expect(
    dungeonManager.removeDungeon("audit-dungeon", "audit-owner", data.db),
  ).rejects.toThrow("Finish the active battle");
  expect(await data.db.select().from(TB_dungeonParticipant)).toHaveLength(1);
  expect((await data.db.select().from(TB_dungeonBattle))[0]!.battleId).toBe(
    battleId,
  );
  expect(
    (await getDungeonRun("audit-dungeon", "audit-owner", data.db))
      .activeBattleId,
  ).toBe(battleId);
  // Even legacy inconsistent markers must retain an undelivered attempt.
  await data.db
    .update(TB_dungeonData)
    .set({ activeBattle: false, activeBattleId: null });
  await expect(
    dungeonManager.removeDungeon("audit-dungeon", "audit-owner", data.db),
  ).rejects.toThrow("rewards are still");
});

test("only the creator can remove a prepared run, and removal uses the transaction connection", async () => {
  await expect(
    dungeonManager.removeDungeon("audit-dungeon", "outsider", data.db),
  ).rejects.toThrow();
  expect(await data.db.select().from(TB_dungeonData)).toHaveLength(1);
  await dungeonManager.removeDungeon("audit-dungeon", "audit-owner", data.db);
  expect(await data.db.select().from(TB_dungeonData)).toHaveLength(0);
  expect(await data.db.select().from(TB_dungeonParticipant)).toHaveLength(0);
});

test("a malformed completion cannot consume the attempt marker or grant partial rewards", async () => {
  const battleId = await beginDungeonAttempt(
    "audit-dungeon",
    "audit-owner",
    data.db,
  );
  await expect(
    dungeonManager.handleDungeonCleared(
      "audit-dungeon",
      battleId,
      [],
      [],
      "TEAM_A",
      data.db,
    ),
  ).rejects.toThrow("expedition party");
  expect(
    (await data.db.select().from(TB_dungeonBattle))[0]!.completedAt,
  ).toBeNull();
  expect((await data.db.select().from(TB_dungeonData))[0]!.round).toBe(0);
  expect(await data.db.select().from(TB_loot)).toHaveLength(0);
});

test("versioned builds preserve legacy SuperJSON and unbounded target counts without combat hooks", async () => {
  const hero = await EntityFactory.createCharacter("audit-hero", data.db);
  hero.spells.push(createSpellFromType("aoe", "earthshatter"));
  const builds = captureStartingBuilds([hero]);
  const current = serializeStartingBuilds(builds);
  expect(current.version).toBe(1);
  expect(deserializeStartingBuilds(current)).toEqual(builds);
  expect(deserializeStartingBuilds(SuperJSON.serialize(builds))).toEqual(
    builds,
  );
  expect(
    SuperJSON.deserialize<ReturnType<typeof captureStartingBuilds>>(current),
  ).toEqual(builds);
  expect(
    restoreStartingBuilds(deserializeStartingBuilds(current))[0]!.spells.at(-1)!
      .config.targetType.enemies,
  ).toBe(Infinity);
  expect(() => deserializeStartingBuilds({ ...current, version: 2 })).toThrow(
    "Unsupported",
  );
  expect(() => decodeStartingBuilds([{ ...builds[0], spells: null }])).toThrow(
    "Invalid saved",
  );
});

test("unknown saved build metadata is rejected instead of falling back to today's roster", async () => {
  const battleId = await beginDungeonAttempt(
    "audit-dungeon",
    "audit-owner",
    data.db,
  );
  const [saved] = await data.db.select().from(TB_battleStart);
  await data.db
    .update(TB_battleStart)
    .set({ builds: { ...saved!.builds, version: 99 } });
  await expect(new SyncFactory(data.db).get(battleId)).rejects.toThrow(
    "Unsupported saved battle build version",
  );
});
