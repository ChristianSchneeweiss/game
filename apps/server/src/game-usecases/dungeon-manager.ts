import { BM } from "@loot-game/game/battle";
import { dungeon1 } from "@loot-game/game/dungeons/dungeon1";
import type { DungeonData } from "@loot-game/game/dungeons/types";
import type { Entity } from "@loot-game/game/types";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  id,
  TB_dungeonData,
  TB_dungeonEnemy,
  TB_dungeonParticipant,
} from "../db/schema";
import { EntityFactory } from "./entity-factory";

export const dungeonManager = {
  enterDungeon: async (
    characters: Entity[],
    key: "dungeon-1",
    db: PostgresJsDatabase
  ) => {
    const dungeon = {
      id: id(),
      playerTeam: characters,
      round: 0,
      actualEnemies: dungeon1().rollEnemies(),
      key: key,
    } satisfies DungeonData;

    await db.transaction(async (tx) => {
      await tx.insert(TB_dungeonData).values({
        id: dungeon.id,
        key: dungeon.key,
        round: dungeon.round,
      });
      for (const character of characters) {
        await tx.insert(TB_dungeonParticipant).values({
          dungeonId: dungeon.id,
          characterId: character.id,
        });
      }
      for (const [index, round] of dungeon.actualEnemies.entries()) {
        await tx.insert(TB_dungeonEnemy).values(
          round.map((enemy) => ({
            dungeonId: dungeon.id,
            enemyKey: enemy.id,
            inRound: index,
          }))
        );
      }
    });

    // todo store in db
    return dungeon;
  },
  getDungeon: async (id: string, db: PostgresJsDatabase) => {
    const [dungeon] = await db
      .select()
      .from(TB_dungeonData)
      .where(eq(TB_dungeonData.id, id));
    if (!dungeon) {
      throw new Error("Dungeon not found");
    }
    const participants = await db
      .select()
      .from(TB_dungeonParticipant)
      .where(eq(TB_dungeonParticipant.dungeonId, id));
    const enemyData = await db
      .select()
      .from(TB_dungeonEnemy)
      .where(eq(TB_dungeonEnemy.dungeonId, id));

    const enemies = EntityFactory.createEnemyFromDb(enemyData, db);
    const playerTeam = [];
    for (const participant of participants) {
      const character = await EntityFactory.createCharacter(
        participant.characterId,
        db
      );
      playerTeam.push(character);
    }

    return {
      id,
      playerTeam,
      round: dungeon.round,
      actualEnemies: enemies,
      key: dungeon.key,
    } as DungeonData;
  },
  fightRound: async (id: string, db: PostgresJsDatabase) => {
    const dungeon = await dungeonManager.getDungeon(id, db);
    const bm = new BM(dungeon.playerTeam);
    const enemies = dungeon.actualEnemies[dungeon.round];
    if (!enemies) {
      throw new Error("No enemies found");
    }
    for (const enemy of enemies) {
      bm.join(enemy);
    }
    bm.fight();

    dungeon.round++;

    await db.transaction(async (tx) => {
      await tx
        .update(TB_dungeonData)
        .set({
          round: dungeon.round,
        })
        .where(eq(TB_dungeonData.id, id));

      const config = dungeon1();

      if (dungeon.round >= config.availableEnemies.length) {
        await tx
          .update(TB_dungeonData)
          .set({ cleared: true })
          .where(eq(TB_dungeonData.id, id));
      }

      // todo save round results
    });

    return bm;
  },
};
