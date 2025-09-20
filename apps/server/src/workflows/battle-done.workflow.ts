import type { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import { EnemyTypeSchema } from "@loot-game/game/enemies/base/enemy-types";
import {
  WorkflowEntrypoint,
  WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import z from "zod";
import { TB_activeBattle, TB_dungeonBattle } from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";
import { dungeonManager } from "../game-usecases/dungeon-manager";
import { EntityFactory } from "../game-usecases/entity-factory";
import { SyncFactory } from "../game-usecases/sync-factory";

export type Params = {
  battleId: string;
};

export const characterDataSchema = z.object({
  id: z.string(),
  health: z.number(),
  mana: z.number(),
  dead: z.boolean(),
});

export const enemyDataSchema = z.object({
  id: z.string(),
  type: EnemyTypeSchema,
  health: z.number(),
  dead: z.boolean(),
});

export const battleResultSchema = z.object({
  winner: z.union([z.literal("TEAM_A"), z.literal("TEAM_B")]),
  teamA: z.array(characterDataSchema),
  teamB: z.array(enemyDataSchema),
});

export type CharacterData = z.infer<typeof characterDataSchema>;
export type BattleResult = z.infer<typeof battleResultSchema>;

export class BattleDoneWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { battleId } = event.payload;
    const battleResult = await step.do("get-battle-result", async () => {
      const db = drizzle(this.env.DATABASE_URL);
      return await bmStorage.get(battleId, db);
    });

    await step.do("update-dungeon", async () => {
      const db = drizzle(this.env.DATABASE_URL);
      const [dungeonBattle] = await db
        .select()
        .from(TB_dungeonBattle)
        .where(eq(TB_dungeonBattle.battleId, battleId));
      if (!dungeonBattle) {
        console.error("Dungeon battle not found");
        return;
      }

      const enemies: BaseEnemy[] = [];
      for (const enemy of battleResult.teamB.filter((e) => e.dead)) {
        const enemyEntity = EntityFactory.createEnemyFromType(
          enemy.type,
          enemy.id
        );
        enemies.push(enemyEntity);
      }

      await dungeonManager.handleDungeonCleared(
        dungeonBattle.dungeonId,
        battleId,
        enemies,
        battleResult.teamA,
        battleResult.winner,
        db
      );
    });

    await step.do("clean-up-battle", async () => {
      const db = drizzle(this.env.DATABASE_URL);
      const syncFactory = new SyncFactory(db);
      await syncFactory.cleanup(battleId);

      await db
        .delete(TB_activeBattle)
        .where(eq(TB_activeBattle.battleId, battleId));
    });

    console.log("Battle cleared workflow done");
  }
}
