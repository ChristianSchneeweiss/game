import { Character } from "@loot-game/game/base-entity";
import type { BattleManager } from "@loot-game/game/battle-types";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import { eq } from "drizzle-orm";
import { TB_battleParticipants, type Database } from "../db/schema";
import { EntityFactory } from "./entity-factory";

export class SyncFactory {
  constructor(private readonly db: Database) {}

  async addBattleManager(bm: BattleManager) {
    const characters = bm.entities.filter((e) => e instanceof Character);
    const enemies = bm.entities.filter((e) => e instanceof BaseEnemy);
    await this.add(bm.battleId, characters, enemies);
  }

  async add(battleId: string, characters: Character[], enemies: BaseEnemy[]) {
    await this.db.transaction(async (tx) => {
      for (const character of characters) {
        await tx.insert(TB_battleParticipants).values({
          battleId: battleId,
          entityId: character.id,
          isBot: false,
          team: character.team,
        });
      }
      for (const enemy of enemies) {
        await tx.insert(TB_battleParticipants).values({
          battleId: battleId,
          entityId: enemy.id,
          isBot: true,
          team: enemy.team,
          enemyType: enemy.type,
        });
      }
    });
  }

  async get(battleId: string) {
    const participants = await this.db
      .select()
      .from(TB_battleParticipants)
      .where(eq(TB_battleParticipants.battleId, battleId));

    const characterIds = participants
      .filter((p) => !p.isBot)
      .map((p) => p.entityId);

    const characters = await Promise.all(
      characterIds.map((p) => EntityFactory.createCharacter(p, this.db))
    );
    const enemies = await Promise.all(
      participants
        .filter((p) => p.isBot)
        .filter((p) => p.enemyType)
        .map((p) => EntityFactory.createEnemyFromType(p.enemyType!, p.entityId))
    );

    return {
      characters,
      enemies,
    };
  }

  async cleanup(battleId: string) {
    await this.db
      .delete(TB_battleParticipants)
      .where(eq(TB_battleParticipants.battleId, battleId));
  }
}
