import type { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import {
  WorkflowEntrypoint,
  WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { TB_activeBattle, TB_dungeonBattle } from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";
import { dungeonManager } from "../game-usecases/dungeon-manager";
import { EntityFactory } from "../game-usecases/entity-factory";
import { SyncFactory } from "../game-usecases/sync-factory";

export type Params = {
  battleId: string;
};

export {
  characterDataSchema,
  enemyDataSchema,
  battleResultSchema,
  type CharacterData,
  type BattleResult,
} from "../battle/result";

export class BattleDoneWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { battleId } = event.payload;
    await step.do("get-battle-result", async () => {
      const db = drizzle(this.env.DATABASE_URL);
      await db.transaction(async (tx) => {
        const battleResult = await bmStorage.get(battleId, db);
        const [dungeonBattle] = await tx
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
            enemy.id,
          );
          enemies.push(enemyEntity);
        }
        await dungeonManager.handleDungeonCleared(
          dungeonBattle.dungeonId,
          battleId,
          enemies,
          battleResult.teamA,
          battleResult.winner,
          tx,
        );
        const syncFactory = new SyncFactory(tx);
        await syncFactory.cleanup(battleId);

        await tx
          .delete(TB_activeBattle)
          .where(eq(TB_activeBattle.battleId, battleId));
      });
      console.log("Battle cleared workflow done");
    });
  }
}
