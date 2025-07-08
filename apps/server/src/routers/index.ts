import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  id,
  TB_character,
  TB_dungeonData,
  TB_dungeonParticipant,
  TB_spellStats,
  TB_user,
} from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";
import {
  createCharacter,
  equipSpell,
  unequipSpell,
} from "../game-usecases/character";
import { dungeonManager } from "../game-usecases/dungeon-manager";
import { EntityFactory } from "../game-usecases/entity-factory";
import { createSpell } from "../game-usecases/spell-factory";
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

    await createCharacter("noobie", session.id, db);
  }),

  createCharacter: protectedProcedure.mutation(async ({ ctx }) => {
    const { session, db } = ctx;
    if (!session) {
      throw new Error("No session found");
    }
    await createCharacter(`noobie-${id()}`, session.id, db);
  }),

  getCharacters: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    if (!session) {
      throw new Error("No session found");
    }
    const characters = await EntityFactory.createCharactersFromUser(
      session.id,
      db
    );

    return characters;
  }),

  getCharacter: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const character = await EntityFactory.createCharacter(input.id, db);
      return character;
    }),

  equipSpell: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        spellId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;
      if (!session) {
        throw new Error("No session found");
      }
      await equipSpell(input.characterId, input.spellId, db);
    }),

  unequipSpell: protectedProcedure
    .input(z.object({ spellId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;
      if (!session) {
        throw new Error("No session found");
      }
      await unequipSpell(input.spellId, db);
    }),

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

  enterDungeon: protectedProcedure.mutation(async ({ ctx }) => {
    const { session, db } = ctx;
    const characters = await EntityFactory.createCharactersFromUser(
      session.id,
      db
    );
    console.log("characters", characters.length);
    const dungeon = await dungeonManager.enterDungeon(
      characters,
      "dungeon-1",
      db
    );
    return dungeon;
  }),

  activeDungeons: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const dungeons = await db
      .select({ id: TB_dungeonData.id, key: TB_dungeonData.key })
      .from(TB_dungeonData)
      .innerJoin(
        TB_dungeonParticipant,
        eq(TB_dungeonData.id, TB_dungeonParticipant.dungeonId)
      )
      .innerJoin(
        TB_character,
        eq(TB_dungeonParticipant.characterId, TB_character.id)
      )
      .where(
        and(
          eq(TB_character.userId, session.id),
          eq(TB_dungeonData.cleared, false)
        )
      );

    const uniques = new Map<string, { id: string; key: string }>();
    for (const dungeon of dungeons) {
      uniques.set(dungeon.id, dungeon);
    }

    return Array.from(uniques.values());
  }),

  getDungeon: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const dungeon = await dungeonManager.getDungeon(input.id, db);
      return dungeon;
    }),

  fightDungeon: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;
      const bm = await dungeonManager.fightRound(input.id, db);

      const battleId = await bmStorage.save(bm);
      return battleId;
    }),

  getBattle: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const { db } = ctx;
    const timeline = await bmStorage.get(input);
    return timeline;
  }),
});

export type AppRouter = typeof appRouter;
