import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  TB_battleResult,
  TB_dungeonBattle,
  TB_dungeonData,
  type Database,
} from "../db/schema";
import { TB_preparation } from "../db/shared-preparation-schema";
import { getDungeonParty, requireDungeonParty } from "./dungeon-access";
import { bmStorage } from "./bm-storage";
import { dungeonManager } from "./dungeon-manager";
import { EntityFactory } from "./entity-factory";
import type { Entity } from "@loot-game/game/entity-types";
import { returnBattleSupplies } from "./battle-supplies";

export class DungeonEncounterChangedError extends TRPCError {
  constructor() {
    super({
      code: "CONFLICT",
      message:
        "The active encounter must stop before abandoning this run; refresh the current encounter",
    });
  }
}

/** Active encounters require the battle DO to freeze commands before this call. */
export async function abandonDungeon(
  dungeonId: string,
  userId: string,
  db: Database,
  options: {
    allowActiveBattle?: boolean;
    expectedBattleId?: string;
    remainingSupplies?: readonly Pick<Entity, "id" | "consumables">[];
  } = {},
) {
  return db.transaction(async (tx) => {
    const [run] = await tx
      .select()
      .from(TB_dungeonData)
      .where(eq(TB_dungeonData.id, dungeonId))
      .for("update");
    if (!run)
      throw new TRPCError({ code: "NOT_FOUND", message: "Dungeon not found" });
    requireDungeonParty(
      run.createdBy,
      await getDungeonParty(dungeonId, tx),
      userId,
    );
    if (run.abandonedAt)
      return {
        dungeonId,
        battleId: run.activeBattleId,
        abandonedAt: run.abandonedAt,
      };
    if (
      run.activeBattle &&
      (!options.allowActiveBattle ||
        (options.expectedBattleId &&
          run.activeBattleId !== options.expectedBattleId))
    )
      throw new DungeonEncounterChangedError();
    const battleId = run.activeBattleId;
    // A saved completed outcome is earned even if the workflow is still queued.
    // Its normal idempotent settlement must finish before the terminal marker.
    if (battleId) {
      const [saved] = await tx
        .select({ battleId: TB_battleResult.battleId })
        .from(TB_battleResult)
        .where(eq(TB_battleResult.battleId, battleId));
      if (saved) {
        const result = await bmStorage.get(battleId, tx);
        await dungeonManager.handleDungeonCleared(
          dungeonId,
          battleId,
          result.teamB
            .filter((enemy) => enemy.dead)
            .map((enemy) =>
              EntityFactory.createEnemyFromType(enemy.type, enemy.id),
            ),
          result.teamA,
          result.winner,
          tx,
        );
      } else {
        await returnBattleSupplies(
          battleId,
          options.remainingSupplies ?? [],
          tx,
        );
        await tx
          .update(TB_dungeonBattle)
          .set({ abandonedAt: new Date() })
          .where(
            and(
              eq(TB_dungeonBattle.battleId, battleId),
              isNull(TB_dungeonBattle.completedAt),
            ),
          );
      }
    }
    const abandonedAt = new Date();
    await tx
      .update(TB_dungeonData)
      .set({ abandonedAt, activeBattle: false, activeBattleId: battleId })
      .where(eq(TB_dungeonData.id, dungeonId));
    await tx
      .update(TB_preparation)
      .set({
        hostReadyRevision: null,
        guestReadyRevision: null,
        revision: sql`${TB_preparation.revision} + 1`,
      })
      .where(eq(TB_preparation.dungeonId, dungeonId));
    return { dungeonId, battleId, abandonedAt };
  });
}
