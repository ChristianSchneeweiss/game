import { TB_user } from "../db/schema";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";

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
  }),
});

export type AppRouter = typeof appRouter;
