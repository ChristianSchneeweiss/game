import { and, eq, inArray } from "drizzle-orm";
import { routeRewardKey } from "@loot-game/game/dungeons/route";
import {
  TB_dungeonBattle,
  TB_dungeonData,
  TB_loot,
  type Database,
} from "../db/schema";
import { bmStorage } from "./bm-storage";
import { dungeonManager } from "./dungeon-manager";
import { EntityFactory } from "./entity-factory";
import { readDungeon, getDungeonBattles } from "./dungeon-queries";
import { getDungeonParty, requireDungeonParty } from "./dungeon-access";
import { TRPCError } from "@trpc/server";
import { TB_preparation } from "../db/shared-preparation-schema";
import { readPreparation } from "./shared-preparation-read";
import { areFriends } from "./social-relations";

/** A persisted run and only the current player's unclaimed rewards. */
export function getDungeonRun(id: string, userId: string, db: Database) {
  return db.transaction((tx) => readDungeonRun(id, userId, tx), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
}

async function readDungeonRun(id: string, userId: string, db: Database) {
  const [record] = await db
    .select()
    .from(TB_dungeonData)
    .where(eq(TB_dungeonData.id, id));
  if (!record)
    throw new TRPCError({ code: "NOT_FOUND", message: "Dungeon not found" });
  const party = await getDungeonParty(id, db);
  requireDungeonParty(record.createdBy, party, userId);
  const dungeon = await readDungeon(record, db);
  const [preparation] = await db
    .select()
    .from(TB_preparation)
    .where(eq(TB_preparation.dungeonId, id));
  const shared = preparation
    ? {
        ...(await readPreparation(preparation, db)),
        preparationId: preparation.id,
        canPlayAgain:
          !record.abandonedAt &&
          !record.activeBattle &&
          (record.cleared ||
            !record.characterData.some((hero) => hero.health > 0)) &&
          !!preparation.guestUserId &&
          (await areFriends(
            preparation.hostUserId,
            preparation.guestUserId,
            db,
          )),
      }
    : null;
  const battles = await getDungeonBattles(id, db);
  const rewardKeys = [
    ...battles.map((battle) => battle.battleId),
    ...(dungeon.route?.decisions ?? []).map((decision) =>
      routeRewardKey(id, decision.wave),
    ),
  ];
  const loot = await db
    .select()
    .from(TB_loot)
    .where(
      and(inArray(TB_loot.battleId, rewardKeys), eq(TB_loot.userId, userId)),
    );
  return {
    ...dungeon,
    abandonedAt: record.abandonedAt,
    shared,
    activeBattleId:
      record.activeBattleId ??
      (record.activeBattle ? battles.at(-1)?.battleId : null),
    battles,
    loot,
    name: dungeonManager.getDungeonConfig(dungeon.key).name,
  };
}

export function getDungeonBattleContext(
  battleId: string,
  userId: string,
  db: Database,
) {
  return db.transaction((tx) => readBattleContext(battleId, userId, tx), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
}

async function readBattleContext(
  battleId: string,
  userId: string,
  db: Database,
) {
  const [attempt] = await db
    .select()
    .from(TB_dungeonBattle)
    .where(eq(TB_dungeonBattle.battleId, battleId));
  if (!attempt) return null;
  const run = await readDungeonRun(attempt.dungeonId, userId, db);
  // The saved replay may arrive before the reward transaction commits.
  const result = attempt.completedAt ? await bmStorage.get(battleId, db) : null;
  const xp =
    result?.teamB
      .filter((enemy) => enemy.dead)
      .reduce(
        (total, enemy) =>
          total + EntityFactory.createEnemyFromType(enemy.type, enemy.id).xp,
        0,
      ) ?? 0;
  return {
    run,
    attempt,
    xpAwards:
      result?.teamA.map((hero) => ({
        characterId: hero.id,
        xp: hero.dead ? 0 : xp,
      })) ?? [],
  };
}
