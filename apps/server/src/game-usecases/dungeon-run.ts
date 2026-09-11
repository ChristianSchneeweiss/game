import { TRPCError } from "@trpc/server";
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

/** A persisted run and only the current player's unclaimed rewards. */
export async function getDungeonRun(id: string, userId: string, db: Database) {
  const [dungeon, [record], battles] = await Promise.all([
    dungeonManager.getDungeon(id, db),
    db.select().from(TB_dungeonData).where(eq(TB_dungeonData.id, id)),
    dungeonManager.getDungeonBattles(id, db),
  ]);
  if (
    record.createdBy !== userId &&
    !dungeon.playerTeam.some((c) => c.userId === userId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This run belongs to another party",
    });
  }
  const rewardKeys = [
    ...battles.map((battle) => battle.battleId),
    ...(record.route?.decisions ?? []).map((decision) =>
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
    activeBattleId:
      record.activeBattleId ??
      (record.activeBattle ? battles.at(-1)?.battleId : null),
    battles,
    loot,
    name: dungeonManager.getDungeonConfig(dungeon.key).name,
  };
}

export async function getDungeonBattleContext(
  battleId: string,
  userId: string,
  db: Database,
) {
  const [attempt] = await db
    .select()
    .from(TB_dungeonBattle)
    .where(eq(TB_dungeonBattle.battleId, battleId));
  if (!attempt) return null;
  const run = await getDungeonRun(attempt.dungeonId, userId, db);
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
