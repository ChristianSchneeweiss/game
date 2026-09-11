import { DungeonKeySchema } from "@loot-game/game/dungeons/dungeon-keys";
import { routeActionSchema } from "@loot-game/game/dungeons/route";
import { chooseDungeonPath } from "../game-usecases/dungeon-route";
import { and, eq } from "drizzle-orm";
import z from "zod";
import {
  TB_character,
  TB_dungeonData,
  TB_dungeonParticipant,
} from "../db/schema";
import { dungeonManager } from "../game-usecases/dungeon-manager";
import {
  getDungeonBattleContext,
  getDungeonRun,
} from "../game-usecases/dungeon-run";
import { EntityFactory } from "../game-usecases/entity-factory";
import { beginDungeonAttempt } from "../game-usecases/dungeon-attempt";
import { protectedProcedure, router } from "../lib/trpc";

export const dungeonRouter = router({
  getConfig: protectedProcedure
    .input(z.object({ key: DungeonKeySchema }))
    .query(({ input }) => dungeonManager.getDungeonConfig(input.key)),
  getRun: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getDungeonRun(input.id, ctx.session.id, ctx.db)),

  getBattleContext: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .query(({ ctx, input }) =>
      getDungeonBattleContext(input.battleId, ctx.session.id, ctx.db),
    ),

  enterDungeon: protectedProcedure
    .input(
      z.object({
        key: DungeonKeySchema,
        characters: z.string().array(),
        branching: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const characters = await Promise.all(
        input.characters.map((characterId) =>
          EntityFactory.createCharacter(characterId, db),
        ),
      );
      const dungeon = await dungeonManager.enterDungeon(
        characters,
        input.key,
        session.id,
        db,
        { branching: input.branching },
      );
      return dungeon;
    }),

  choosePath: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        wave: z.number().int().positive(),
        offerId: z.string().min(1),
        action: routeActionSchema,
      }),
    )
    .mutation(({ ctx, input }) =>
      chooseDungeonPath(
        input.id,
        input.wave,
        input.offerId,
        input.action,
        ctx.session.id,
        ctx.db,
      ),
    ),

  activeDungeons: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const dungeons = await db
      .select({ id: TB_dungeonData.id, key: TB_dungeonData.key })
      .from(TB_dungeonData)
      .innerJoin(
        TB_dungeonParticipant,
        eq(TB_dungeonData.id, TB_dungeonParticipant.dungeonId),
      )
      .innerJoin(
        TB_character,
        eq(TB_dungeonParticipant.characterId, TB_character.id),
      )
      .where(
        and(
          eq(TB_character.userId, session.id),
          eq(TB_dungeonData.cleared, false),
        ),
      );

    const uniques = new Map<string, { id: string; key: string }>();
    for (const dungeon of dungeons) {
      uniques.set(dungeon.id, dungeon);
    }

    return Array.from(uniques.values());
  }),

  allDungeons: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const dungeons = await db
      .select({
        id: TB_dungeonData.id,
        key: TB_dungeonData.key,
        cleared: TB_dungeonData.cleared,
        round: TB_dungeonData.round,
        createdBy: TB_dungeonData.createdBy,
        createdAt: TB_dungeonData.createdAt,
        activeBattle: TB_dungeonData.activeBattle,
      })
      .from(TB_dungeonData)
      .innerJoin(
        TB_dungeonParticipant,
        eq(TB_dungeonData.id, TB_dungeonParticipant.dungeonId),
      )
      .innerJoin(
        TB_character,
        eq(TB_dungeonParticipant.characterId, TB_character.id),
      )
      .where(and(eq(TB_character.userId, session.id)));

    const uniques = new Map<
      string,
      {
        id: string;
        key: string;
        cleared: boolean;
        round: number;
        guest: boolean;
        createdAt: Date;
        activeBattle: boolean;
      }
    >();
    for (const dungeon of dungeons) {
      uniques.set(dungeon.id, {
        id: dungeon.id,
        key: dungeon.key,
        cleared: dungeon.cleared,
        round: dungeon.round,
        guest: dungeon.createdBy !== session.id,
        createdAt: dungeon.createdAt ?? new Date(),
        activeBattle: dungeon.activeBattle,
      });
    }

    return Array.from(uniques.values());
  }),

  getDungeon: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      return dungeonManager.getDungeon(input.id, db);
    }),

  getDungeonBattles: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const battles = await dungeonManager.getDungeonBattles(input.id, db);
      return battles;
    }),

  fightDungeon: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => beginDungeonAttempt(input.id, ctx.session.id, ctx.db)),

  removeDungeon: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      await dungeonManager.removeDungeon(input.id, session.id, db);
    }),
});
