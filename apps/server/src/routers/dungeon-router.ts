import { DungeonKeySchema } from "@loot-game/game/dungeons/dungeon-keys";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";
import {
  id,
  TB_character,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_dungeonParticipant,
} from "../db/schema";
import { dungeonManager } from "../game-usecases/dungeon-manager";
import {
  getDungeonBattleContext,
  getDungeonRun,
} from "../game-usecases/dungeon-run";
import { EntityFactory } from "../game-usecases/entity-factory";
import { SyncFactory } from "../game-usecases/sync-factory";
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
    .input(z.object({ key: DungeonKeySchema, characters: z.string().array() }))
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
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const battleId = id();
      await db.transaction(async (tx) => {
        const [claimed] = await tx
          .update(TB_dungeonData)
          .set({ activeBattle: true, activeBattleId: battleId })
          .where(
            and(
              eq(TB_dungeonData.id, input.id),
              eq(TB_dungeonData.activeBattle, false),
              eq(TB_dungeonData.cleared, false),
            ),
          )
          .returning();
        if (!claimed)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dungeon is unavailable, already in a battle, or cleared",
          });
        if (claimed.createdBy !== ctx.session.id) {
          const [participant] = await tx
            .select({ id: TB_character.id })
            .from(TB_dungeonParticipant)
            .innerJoin(
              TB_character,
              eq(TB_dungeonParticipant.characterId, TB_character.id),
            )
            .where(
              and(
                eq(TB_dungeonParticipant.dungeonId, input.id),
                eq(TB_character.userId, ctx.session.id),
              ),
            )
            .limit(1);
          if (!participant)
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Only the dungeon creator or a participant's owner may start a battle",
            });
        }
        const dungeon = await dungeonManager.getDungeon(input.id, tx);
        if (!dungeon.playerTeam.some((character) => character.health > 0)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your party has fallen. Prepare a new run to recover.",
          });
        }
        await tx.insert(TB_dungeonBattle).values({
          dungeonId: input.id,
          battleId: battleId,
          round: dungeon.round,
        });

        const syncFactory = new SyncFactory(tx);

        await syncFactory.add(
          battleId,
          dungeon.playerTeam,
          dungeon.actualEnemies[dungeon.round],
        );
      });

      return battleId;
    }),

  removeDungeon: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      await dungeonManager.removeDungeon(input.id, session.id, db);
    }),
});
