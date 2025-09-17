import {
  WorkflowEntrypoint,
  WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { TB_activeBattle } from "../db/schema";

export type Params = {
  battleId: string;
};

export class ActiveBattleWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { battleId } = event.payload;

    await step.do("set-live", async () => {
      const db = await this.getDb();
      const [activeBattle] = await db
        .select()
        .from(TB_activeBattle)
        .where(eq(TB_activeBattle.battleId, battleId));
      if (!activeBattle) {
        await db.insert(TB_activeBattle).values({ battleId });
        return;
      }
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      // only update if last action is more than 2 minutes ago
      if (activeBattle.lastAction > twoMinutesAgo) {
        return;
      }

      await db
        .insert(TB_activeBattle)
        .values({ battleId })
        .onConflictDoUpdate({
          target: TB_activeBattle.battleId,
          set: { lastAction: new Date() },
        });
    });

    await step.do("cleanup-old-battles", async () => {
      const db = await this.getDb();
      const timeLimit = new Date(Date.now() - 10 * 60 * 1000); // older than 10 minutes
      await db
        .delete(TB_activeBattle)
        .where(lt(TB_activeBattle.lastAction, timeLimit));
    });
  }

  private async getDb() {
    return drizzle(this.env.HYPERDRIVE.connectionString);
  }
}
