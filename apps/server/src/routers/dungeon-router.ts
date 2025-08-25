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
import { EntityFactory } from "../game-usecases/entity-factory";
import { SyncFactory } from "../game-usecases/sync-factory";
import { protectedProcedure, router } from "../lib/trpc";

export const dungeonRouter = router({
  enterDungeon: protectedProcedure.mutation(async ({ ctx }) => {
    const { session, db } = ctx;
    const characters = await EntityFactory.createCharactersFromUser(
      session.id,
      db
    );
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

  allDungeons: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const dungeons = await db
      .select({
        id: TB_dungeonData.id,
        key: TB_dungeonData.key,
        cleared: TB_dungeonData.cleared,
      })
      .from(TB_dungeonData)
      .innerJoin(
        TB_dungeonParticipant,
        eq(TB_dungeonData.id, TB_dungeonParticipant.dungeonId)
      )
      .innerJoin(
        TB_character,
        eq(TB_dungeonParticipant.characterId, TB_character.id)
      )
      .where(and(eq(TB_character.userId, session.id)));

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
      const syncFactory = new SyncFactory(ctx.cfEnv);
      const dungeon = await dungeonManager.getDungeon(input.id, db);
      const battleId = id();
      await db.insert(TB_dungeonBattle).values({
        dungeonId: input.id,
        battleId: battleId,
        round: dungeon.round,
      });

      await syncFactory.addConfigToSync(
        {
          characters: dungeon.playerTeam.map((character) => character.id),
          enemies: dungeon.actualEnemies[dungeon.round].map(
            (enemy) => enemy.id
          ),
        },
        battleId
      );
      for (const enemy of dungeon.actualEnemies[dungeon.round]) {
        await syncFactory.addEnemyToSync(enemy, battleId);
      }
      for (const character of dungeon.playerTeam) {
        await syncFactory.addCharacterToSync(character, battleId);
      }

      return battleId;
    }),
});
