import { faker } from "@faker-js/faker";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import { SpellTypeSchema } from "@loot-game/game/spells/base/spell-types";
import { TRPCError } from "@trpc/server";
import { desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { TB_activeBattle, TB_spellStats, TB_user } from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";
import { createCharacter } from "../game-usecases/character";
import { EntityFactory } from "../game-usecases/entity-factory";
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

    await createCharacter(faker.internet.username(), session.id, db);
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
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Create spell is not implemented",
      });
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

    const characters = await EntityFactory.createCharactersFromUser(
      session.id,
      db
    );
    if (characters.length === 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "User has no characters",
      });
    }
    const character = characters.sort((a, b) => a.level - b.level)[0];

    const spellClass = spells.map((spell) => {
      return {
        ...spell,
        description: createSpellFromType(spell.id, spell.type).description(
          character
        ),
      };
    });
    return spellClass;
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
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const battles = await db
      .select()
      .from(TB_activeBattle)
      .where(gt(TB_activeBattle.lastAction, fiveMinsAgo))
      .orderBy(desc(TB_activeBattle.lastAction));
    return battles;
  }),
});

export type AppRouter = typeof appRouter;
