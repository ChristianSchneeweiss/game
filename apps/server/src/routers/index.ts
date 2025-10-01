import { faker } from "@faker-js/faker";
import { itemFactory } from "@loot-game/game/items/equipment/item-factory";
import type { PassiveType } from "@loot-game/game/passive-skills/base/passive-types";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import {
  SpellTypeSchema,
  type SpellType,
} from "@loot-game/game/spells/base/spell-types";
import { TRPCError } from "@trpc/server";
import { desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import {
  TB_activeBattle,
  TB_equipmentStats,
  TB_passivSkillStats,
  TB_spellStats,
  TB_user,
} from "../db/schema";
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
    const grouped = new Map<
      SpellType,
      { spell: (typeof spellClass)[number]; ids: string[] }
    >();

    for (const spell of spellClass) {
      const existing = grouped.get(spell.type);
      if (existing) {
        existing.ids.push(spell.id);
      } else {
        grouped.set(spell.type, { spell: spell, ids: [spell.id] });
      }
    }

    return { grouped, all: spellClass };
  }),

  getBattle: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const timeline = await bmStorage.get(input, ctx.db);
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

  getMyPassiveSkills: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const passiveSkills = await db
      .select()
      .from(TB_passivSkillStats)
      .where(eq(TB_passivSkillStats.userId, session.id));

    const grouped = new Map<
      PassiveType,
      { passiveSkill: (typeof passiveSkills)[number]; ids: string[] }
    >();

    for (const passiveSkill of passiveSkills) {
      const existing = grouped.get(passiveSkill.type);
      if (existing) {
        existing.ids.push(passiveSkill.id);
      } else {
        grouped.set(passiveSkill.type, {
          passiveSkill: passiveSkill,
          ids: [passiveSkill.id],
        });
      }
    }

    return { grouped, all: passiveSkills };
  }),

  getMyEquipment: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const equipment = await db
      .select()
      .from(TB_equipmentStats)
      .where(eq(TB_equipmentStats.userId, session.id));

    const characters = await EntityFactory.createCharactersFromUser(
      session.id,
      db
    );

    const equip = equipment.map((equip) => {
      const character =
        characters.find((character) => character.id === equip.equippedBy) ??
        characters[0];

      const items = itemFactory(equip.type, equip.id, character);
      return {
        ...equip,
        item: items,
      };
    });

    return equip;
  }),
});

export type AppRouter = typeof appRouter;
