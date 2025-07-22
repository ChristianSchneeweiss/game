import { LowHpActionSelectionHook } from "@loot-game/game/trigger-hooks/Low-Hp-THook";
import { eq } from "drizzle-orm";
import z from "zod";
import { id, TB_actionSelectionHook } from "../db/schema";
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

  addLowHpActionHook: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        hpPercentage: z.number(),
        spellId: z.string(),
        priority: z.number().default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const character = await EntityFactory.createCharacter(
        input.characterId,
        db
      );
      const spell = character.spells.find((s) => s.config.id === input.spellId);
      if (!spell) {
        throw new Error("Spell not found");
      }
      const hookId = id();
      const hook = new LowHpActionSelectionHook(
        hookId,
        spell,
        input.hpPercentage,
        input.priority
      );

      await db.insert(TB_actionSelectionHook).values({
        id: hookId,
        characterId: input.characterId,
        name: hook.name,
        priority: hook.priority,
        data: hook.serialize(),
      });
    }),

  removeActionHook: protectedProcedure
    .input(z.object({ hookId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      await db
        .delete(TB_actionSelectionHook)
        .where(eq(TB_actionSelectionHook.id, input.hookId));
    }),
});
