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
  winner: z.enum(["TEAM_A", "TEAM_B"]),
  teamA: z.array(characterDataSchema),
  teamB: z.array(enemyDataSchema),
});

export type CharacterData = z.infer<typeof characterDataSchema>;
export type BattleResult = z.infer<typeof battleResultSchema>;

export class BattleDoneWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { battleId } = event.payload;
    const battleResult = await step.do("get-battle-result", async () => {
      const battleResultData = await this.env.GAME.get(`${battleId}:result`);
      if (!battleResultData) {
        throw new Error("Battle result not found");
      }
      return battleResultSchema.parse(JSON.parse(battleResultData));
    });

    await step.do("update-dungeon", async () => {
      const db = drizzle(this.env.HYPERDRIVE.connectionString);
      const [dungeonBattle] = await db
        .select()
        .from(TB_dungeonBattle)
        .where(eq(TB_dungeonBattle.battleId, battleId));
      if (!dungeonBattle) {
        console.log("Dungeon battle not found");
        return;
      }

      const id = dungeonBattle.dungeonId;
      const enemies: BaseEnemy[] = [];
      for (const enemy of battleResult.teamB.filter((e) => e.dead)) {
        const enemyEntity = EntityFactory.createEnemyFromType(enemy.type);
        enemies.push(enemyEntity);
      }

      await dungeonManager.handleDungeonCleared(
        id,
        battleId,
        enemies,
        battleResult.teamA,
        battleResult.winner,
        db
      );
    });

    await step.do("clean-up-battle", async () => {
      await this.env.GAME.delete(`${battleId}:result`);
      const syncFactory = new SyncFactory(this.env);
      await syncFactory.cleanup(battleId);

      const db = drizzle(this.env.HYPERDRIVE.connectionString);
      await db
        .delete(TB_activeBattle)
        .where(eq(TB_activeBattle.battleId, battleId));
    });

    console.log("Battle cleared workflow done");
  }
}
