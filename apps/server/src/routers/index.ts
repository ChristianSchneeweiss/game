import { SpellTypeSchema } from "@loot-game/game/spells/base/spell-types";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TB_activeBattle, TB_spellStats, TB_user } from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";
import { createCharacter } from "../game-usecases/character";
import { LootManager } from "../game-usecases/loot-manager";
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
        email: session.primaryEmailAddress?.emailAddress,
      })
      .onConflictDoNothing();

    await createCharacter("noobie", session.id, db);
  }),

  character: characterRouter,
  dungeon: dungeonRouter,

  createSpell: protectedProcedure
    .input(
      z.object({
        type: SpellTypeSchema,
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

  getMyLoot: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    if (!session) {
      throw new Error("No session found");
    }
    const lootManager = new LootManager(session.id, db);
    return lootManager.getLoot();
  }),

  claimLoot: protectedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const { session, db } = ctx;
      if (!session) {
        throw new Error("No session found");
      }
      const lootManager = new LootManager(session.id, db);
      await lootManager.claim(input);
    }),

  activeBattles: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    if (!session) {
      throw new Error("No session found");
    }
    const battles = await db
      .select()
      .from(TB_activeBattle)
      .orderBy(desc(TB_activeBattle.lastAction));
    return battles;
  }),
});

export type AppRouter = typeof appRouter;
