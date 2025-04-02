import { TB_player, TB_spellStats, TB_user } from "../db/schema";
import { createInitialPlayer } from "../game-usecases/create-initial-player";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { eq } from "drizzle-orm";
import { Dungeon1 } from "@loot-game/game/dungeons/dungeon-1";
import { EntityFactory } from "../game-usecases/entity-factory";

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

  fightDungeon: protectedProcedure.mutation(async ({ ctx }) => {
    const { session, db } = ctx;
    const dungeon = new Dungeon1();
    const player = await EntityFactory.createPlayer(session.id, db);
    dungeon.addPlayer(player);
    const result = dungeon.fightRound();
    return result.map((r) => ({
      round: r.round,
      result: r.result.map((r) => ({
        ...r,
        caster: r.caster.id,
        affectedTargets: r.affectedTargets.map((t) => t.id),
        entitiesSummoned: r.entitiesSummoned?.map((t) => t.id),
        entitiesRevived: r.entitiesRevived?.map((t) => t.id),
      })),
      deathEvents: r.deathEvents.map((r) => ({
        entityId: r.entityId,
        spellId: r.spellId,
      })),
    }));
  }),
});

export type AppRouter = typeof appRouter;
