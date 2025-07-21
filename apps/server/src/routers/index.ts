import { eq } from "drizzle-orm";
import { z } from "zod";
import { TB_spellStats, TB_user } from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";
import { createCharacter } from "../game-usecases/character";
import { createSpell } from "../game-usecases/spell-factory";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { characterRouter } from "./character-router";
import { dungeonRouter } from "./dungeon-router";

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

    await createCharacter("noobie", session.id, db);
  }),

  character: characterRouter,
  dungeon: dungeonRouter,

  createSpell: protectedProcedure
    .input(
      z.object({
        type: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;
      if (!session) {
        throw new Error("No session found");
      }
      await createSpell(session.id, input.type, db);
    }),

  getMySpells: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    if (!session) {
      throw new Error("No session found");
    }
    const spells = await db
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.userId, session.id));
    return spells;
  }),

  getBattle: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const timeline = await bmStorage.get(input, ctx.cfEnv.GAME);
    return timeline;
  }),
});

export type AppRouter = typeof appRouter;
