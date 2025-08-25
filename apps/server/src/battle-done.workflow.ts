import {
  WorkflowEntrypoint,
  WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import z from "zod";
import { TB_dungeonBattle } from "./db/schema";
import { dungeonManager } from "./game-usecases/dungeon-manager";

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
  health: z.number(),
  dead: z.boolean(),
  xpOnKill: z.number(),
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
      const totalXp = battleResult.teamB.reduce((acc, enemy) => {
        if (!enemy.dead) {
          return acc;
        }
        return acc + enemy.xpOnKill;
      }, 0);

      await dungeonManager.handleDungeonCleared(
        id,
        totalXp,
        battleResult.teamA,
        battleResult.winner,
        db
      );
    });

    console.log("Battle cleared workflow done");
  }
}
