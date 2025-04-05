import { dungeonManager } from "../game-usecases/dungeon-manager";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  TB_dungeonData,
  TB_dungeonParticipant,
  TB_player,
  TB_spellStats,
  TB_user,
} from "../db/schema";
import { createInitialPlayer } from "../game-usecases/create-initial-player";
import { EntityFactory } from "../game-usecases/entity-factory";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { produce } from "immer";
import { bmStorage } from "../game-usecases/bm-storage";

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

    await createInitialPlayer("player", session.id, db);
  }),

  getPlayer: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    if (!session) {
      throw new Error("No session found");
    }
    const [player] = await db
      .select()
      .from(TB_player)
      .where(eq(TB_player.userId, session.id));

    const spells = await db
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.playerId, player.id));

    return { ...player, spells };
  }),

  enterDungeon: protectedProcedure.mutation(async ({ ctx }) => {
    const { session, db } = ctx;
    const player = await EntityFactory.createPlayerFromUser(session.id, db);
    const dungeon = await dungeonManager.enterDungeon(player, "dungeon-1", db);
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
      .innerJoin(TB_player, eq(TB_dungeonParticipant.playerId, TB_player.id))
      .where(
        and(eq(TB_player.userId, session.id), eq(TB_dungeonData.cleared, false))
      );

    return dungeons;
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
