import z from "zod";
import { id } from "../db/schema";
import {
  applyStatIncrease,
  createCharacter,
  equipSpell,
  unequipSpell,
} from "../game-usecases/character";
import { EntityFactory } from "../game-usecases/entity-factory";
import { protectedProcedure, router } from "../lib/trpc";

export const characterRouter = router({
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
      const { db } = ctx;
      await equipSpell(input.characterId, input.spellId, db);
    }),

  unequipSpell: protectedProcedure
    .input(z.object({ spellId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      await unequipSpell(input.spellId, db);
    }),

  applyStatIncrease: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        stats: z.array(
          z.enum(["vitality", "intelligence", "agility", "strength"])
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      // todo we might need a lock here to only allow this once and not make it possible to spam it
      await applyStatIncrease(input.characterId, input.stats, db);
    }),
});
