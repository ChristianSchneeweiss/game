import { Character } from "@loot-game/game/base-entity";
import { cryptOfForgottenEchoes } from "@loot-game/game/dungeons/crypt-of-forgotten-echoes";
import {
  DungeonKeySchema,
  type DungeonKey,
} from "@loot-game/game/dungeons/dungeon-keys";
import { dungeon1 } from "@loot-game/game/dungeons/dungeon1";
import { trialOfTheAshen } from "@loot-game/game/dungeons/trial-of-the-ashen";
import { trialOfTheNature } from "@loot-game/game/dungeons/trial-of-the-nature";
import { trialOfTheStorm } from "@loot-game/game/dungeons/trial-of-the-storm";
import { trialOfTheTides } from "@loot-game/game/dungeons/trial-of-the-tides";
import type {
  DungeonConfig,
  DungeonData,
} from "@loot-game/game/dungeons/types";
import type { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import type { LootEntity } from "@loot-game/game/types";
import { eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import seedrandom from "seedrandom";
import type { CharacterData as BattleResultCharacterData } from "../workflows/battle-done.workflow";
import {
  id,
  TB_character,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_dungeonEnemy,
  TB_dungeonParticipant,
  TB_loot,
} from "../db/schema";
import { handleXpReceived } from "./character";
import { createEnemyFromType } from "./enemy-factory";
import { EntityFactory } from "./entity-factory";
import { LootManager } from "./loot-manager";

export const dungeonManager = {
  enterDungeon: async (
    characters: Character[],
    key: DungeonKey,
    userId: string,
    db: PostgresJsDatabase
  ) => {
    const config = dungeonManager.getDungeonConfig(key);
    if (characters.length > config.maxPartySize) {
      throw new Error("Max party size exceeded");
    }

    const dungeon = {
      id: id(),
      playerTeam: characters,
      round: 0,
      actualEnemies: dungeonManager.rollEnemies(config),
      key: key,
      cleared: false,
      activeBattle: false,
    } satisfies DungeonData;

    await db.transaction(async (tx) => {
      await tx.insert(TB_dungeonData).values({
        id: dungeon.id,
        key: dungeon.key,
        round: dungeon.round,
        characterData: characters.map((character) => ({
          characterId: character.id,
          health: character.health,
          mana: character.mana,
        })),
        createdBy: userId,
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
            id: enemy.id,
            dungeonId: dungeon.id,
            type: enemy.type,
            inRound: index,
          }))
        );
      }
    });

    return dungeon;
  },

  getDungeonBattles: async (id: string, db: PostgresJsDatabase) => {
    const battles = await db
      .select()
      .from(TB_dungeonBattle)
      .where(eq(TB_dungeonBattle.dungeonId, id));
    return battles;
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

    const enemies = EntityFactory.createEnemyFromDb(enemyData);
    const playerTeam: Character[] = [];
    for (const participant of participants) {
      const character = await EntityFactory.createCharacter(
        participant.characterId,
        db
      );
      const characterData = dungeon.characterData.find(
        (c) => c.characterId === character.id
      );
      if (!characterData) {
        throw new Error("Character data not found");
      }
      character.health = characterData.health;
      character.mana = characterData.mana;
      playerTeam.push(character);
    }

    return {
      id,
      playerTeam,
      round: dungeon.round,
      actualEnemies: enemies,
      key: dungeon.key,
      cleared: dungeon.cleared,
      activeBattle: dungeon.activeBattle,
    } as DungeonData;
  },

  handleDungeonCleared: async (
    dungeonId: string,
    battleId: string,
    enemies: BaseEnemy[],
    characters: BattleResultCharacterData[],
    winningTeam: "TEAM_A" | "TEAM_B",
    db: PostgresJsDatabase
  ) => {
    await db.transaction(async (tx) => {
      const [dungeon] = await tx
        .select()
        .from(TB_dungeonData)
        .where(eq(TB_dungeonData.id, dungeonId));
      if (!dungeon) {
        throw new Error("Dungeon not found");
      }

      // this makes sure the dungeon round is the same as the number of battles
      const dungeonBattles = await tx
        .select()
        .from(TB_dungeonBattle)
        .where(eq(TB_dungeonBattle.dungeonId, dungeonId));
      if (!dungeonBattles) {
        throw new Error("Dungeon battle not found");
      }
      // short circuit if we are already at the correct round
      if (dungeon.round === dungeonBattles.length) {
        return;
      }

      if (winningTeam === "TEAM_A") {
        dungeon.round = dungeonBattles.length;
      }
      const totalXp = enemies.reduce((acc, enemy) => acc + enemy.xp, 0);

      for (const character of characters) {
        if (character.dead) {
          continue;
        }
        await handleXpReceived(character.id, totalXp, tx);
      }

      const users = await tx
        .select({
          userId: TB_character.userId,
        })
        .from(TB_character)
        .where(
          inArray(
            TB_character.id,
            characters.map((character) => character.id)
          )
        );
      const userIds = new Set(users.map((user) => user.userId));

      const rng = seedrandom(battleId);
      for (const userId of userIds) {
        const lootManager = new LootManager(userId, tx);
        const droppedLoot: LootEntity[] = [];
        for (const enemy of enemies) {
          const drops = await lootManager.drop(rng, enemy.loot);
          if (drops.length > 0) {
            droppedLoot.push(...drops);
          }
        }

        await tx.insert(TB_loot).values({
          userId: userId,
          items: droppedLoot,
          gold: Math.round(
            enemies.reduce(
              (acc, enemy) => acc + (rng() + 0.5) * enemy.loot.gold,
              0
            )
          ),
          battleId: battleId,
        });
      }

      await tx
        .update(TB_dungeonData)
        .set({
          round: dungeon.round,
          activeBattle: false,
          characterData: characters.map((character) => {
            // const characterFromBattle = bm
            //   .getTeam("TEAM_A")
            //   .find((c) => c.id === character.id);
            // if (!characterFromBattle) {
            //   throw new Error("Character not found");
            // }

            return {
              characterId: character.id,
              health: character.health,
              mana: character.mana,
            };
          }),
        })
        .where(eq(TB_dungeonData.id, dungeonId));

      const config = dungeonManager.getDungeonConfig(dungeon.key);
      if (dungeon.round >= config.availableEnemies.length) {
        await tx
          .update(TB_dungeonData)
          .set({ cleared: true })
          .where(eq(TB_dungeonData.id, dungeonId));
      }
    });
  },

  getDungeonConfig: (key: string) => {
    const dungeonKey = DungeonKeySchema.safeParse(key);
    if (!dungeonKey.success) {
      throw new Error("Invalid dungeon key");
    }

    switch (dungeonKey.data) {
      case "dungeon1":
        return dungeon1();
      case "crypt-of-forgotten-echoes":
        return cryptOfForgottenEchoes();
      case "trial-of-the-ashen":
        return trialOfTheAshen();
      case "trial-of-the-nature":
        return trialOfTheNature();
      case "trial-of-the-storm":
        return trialOfTheStorm();
      case "trial-of-the-tides":
        return trialOfTheTides();
      default:
        throw new Error("Invalid dungeon key");
    }
  },

  rollEnemies: (config: DungeonConfig) => {
    return config.availableEnemies.map((enemies) =>
      enemies.map((enemy) => createEnemyFromType(enemy))
    );
  },
};
