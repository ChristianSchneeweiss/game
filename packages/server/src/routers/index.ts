import { TB_player, TB_user } from "../db/schema";
import { createInitialPlayer } from "../game-usecases/create-initial-player";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { eq } from "drizzle-orm";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  protected: protectedProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  createUser: protectedProcedure.mutation(async ({ ctx }) => {
    const { session, db } = ctx;
    if (!session) {
      throw new Error("No session found");
    }
    await db
      .insert(TB_user)
      .values({
        id: session.id,
        email: session.email,
      })
      .onConflictDoNothing();

    await createInitialPlayer("player", session.id, db);
  }),

  getPlayer: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    if (!session) {
      throw new Error("No session found");
    }
    const [player] = await db
      .select()
      .from(TB_player)
      .where(eq(TB_player.userId, session.id));

    return player;
  }),
});

export type AppRouter = typeof appRouter;
