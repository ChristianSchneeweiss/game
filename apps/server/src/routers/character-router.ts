import { faker } from "@faker-js/faker";
import z from "zod";
import { AiControlSchema } from "@loot-game/game/ai-control";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { TB_character } from "../db/schema";
import { ConsumableLoadoutSchema } from "@loot-game/game/items/consumables";
import {
  readConsumableLoadout,
  setConsumableLoadout,
} from "../game-usecases/battle-supplies";
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
  getAiControl: protectedProcedure
    .input(z.object({ characterId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [settings] = await ctx.db
        .select({
          enabled: TB_character.aiEnabled,
          prompt: TB_character.aiPrompt,
          allowConsumables: TB_character.aiAllowConsumables,
        })
        .from(TB_character)
        .where(
          and(
            eq(TB_character.id, input.characterId),
            eq(TB_character.userId, ctx.session.id),
          ),
        );
      if (!settings)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Choose your own character.",
        });
      return settings;
    }),
  setAiControl: protectedProcedure
    .input(
      z.object({ characterId: z.string().min(1), settings: AiControlSchema }),
    )
    .mutation(async ({ ctx, input }) => {
      const [saved] = await ctx.db
        .update(TB_character)
        .set({
          aiEnabled: input.settings.enabled,
          aiPrompt: input.settings.prompt,
          aiAllowConsumables: input.settings.allowConsumables,
        })
        .where(
          and(
            eq(TB_character.id, input.characterId),
            eq(TB_character.userId, ctx.session.id),
          ),
        )
        .returning({ id: TB_character.id });
      if (!saved)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Choose your own character.",
        });
      return input.settings;
    }),
  getConsumableLoadout: protectedProcedure
    .input(z.object({ characterId: z.string().min(1) }))
    .query(({ ctx, input }) =>
      readConsumableLoadout(input.characterId, ctx.session.id, ctx.db),
    ),
  setConsumableLoadout: protectedProcedure
    .input(
      z.object({
        characterId: z.string().min(1),
        loadout: ConsumableLoadoutSchema,
      }),
    )
    .mutation(({ ctx, input }) =>
      setConsumableLoadout(
        input.characterId,
        input.loadout,
        ctx.session.id,
        ctx.db,
      ),
    ),
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
      db,
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      await equipSpell(input.characterId, input.spellId, ctx.session.id, db);
    }),

  unequipSpell: protectedProcedure
    .input(z.object({ spellId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      await unequipSpell(input.spellId, ctx.session.id, db);
    }),

  equipPassiveSkill: protectedProcedure
    .input(z.object({ passiveSkillId: z.string(), characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      await equipPassiveSkill(
        input.characterId,
        input.passiveSkillId,
        session.id,
        db,
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
        db,
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
          z.enum(["vitality", "intelligence", "agility", "strength"]),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      await applyStatIncrease(
        input.characterId,
        input.stats,
        ctx.session.id,
        db,
      );
    }),
});
