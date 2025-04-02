import { BM } from "@loot-game/game/battle";
import { dungeon1 } from "@loot-game/game/dungeons/dungeon1";
import type { DungeonData } from "@loot-game/game/dungeons/types";
import type { Entity } from "@loot-game/game/types";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { id, TB_dungeonData, TB_dungeonParticipant } from "../db/schema";
import { EntityFactory } from "./entity-factory";

export const dungeonManager = {
  enterDungeon: async (
    player: Entity,
    key: "dungeon-1",
    db: PostgresJsDatabase
  ) => {
    const dungeon = {
      id: id(),
      playerTeam: [player],
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
      await tx.insert(TB_dungeonParticipant).values({
        dungeonId: dungeon.id,
        playerId: player.id,
      });
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
    const playerTeam = await EntityFactory.createPlayer(
      participants[0].playerId,
      db
    );

    return {
      id,
      playerTeam: [playerTeam],
      round: dungeon.round,
      actualEnemies: dungeon1().rollEnemies(),
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
