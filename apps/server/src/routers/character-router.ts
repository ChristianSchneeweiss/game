import { faker } from "@faker-js/faker";
import z from "zod";
import {
  applyStatIncrease,
  createCharacter,
  equipEquipment,
  equipPassiveSkill,
  equipSpell,
  renameCharacter,
  unequipEquipment,
  unequipPassiveSkill,
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
    await createCharacter(faker.internet.username(), session.id, db);
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

  searchCharacters: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const characters = await EntityFactory.searchCharacters(input.query, db);
      return characters;
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

  equipPassiveSkill: protectedProcedure
    .input(z.object({ passiveSkillId: z.string(), characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      await equipPassiveSkill(
        input.characterId,
        input.passiveSkillId,
        session.id,
        db
      );
    }),

  unequipPassiveSkill: protectedProcedure
    .input(z.object({ passiveSkillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      await unequipPassiveSkill(input.passiveSkillId, session.id, db);
    }),

  equipEquipment: protectedProcedure
    .input(z.object({ equipmentId: z.string(), characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      await equipEquipment(
        input.characterId,
        input.equipmentId,
        session.id,
        db
      );
    }),

  unequipEquipment: protectedProcedure
    .input(z.object({ equipmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      await unequipEquipment(input.equipmentId, session.id, db);
    }),

  renameCharacter: protectedProcedure
    .input(z.object({ characterId: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      await renameCharacter(ctx.session.id, input.characterId, input.name, db);
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
