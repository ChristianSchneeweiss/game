import { nanoid } from "nanoid";
import { BaseEntity } from "@loot-game/game/base-entity";
import type { Entity } from "@loot-game/game/types";
import { FireballSpell } from "@loot-game/game/spells/fireball";
import { AutoAttackSpell } from "@loot-game/game/spells";
import { TB_dungeonEnemy, TB_player, TB_spellStats } from "../db/schema";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Goblin } from "@loot-game/game/enemies/goblin";

export class EntityFactory {
  static createEnemy(): Entity {
    const baseEntity = new BaseEntity(nanoid(), "Goblin", "TEAM_B", 30, 10, {
      intelligence: 2,
      vitality: 2,
      agility: 2,
      strength: 2,
    });
    baseEntity.spells = [
      new FireballSpell(nanoid()),
      new AutoAttackSpell(nanoid()),
    ];
    return baseEntity;
  }

  static createEnemyFromKey(key: string, db: PostgresJsDatabase): Entity {
    const type = key.split("_")[0];
    switch (type) {
      case "goblin":
        const goblin = new Goblin();
        goblin.id = key;
        return goblin;
      default:
        throw new Error(`Unknown enemy type: ${type}`);
    }
  }

  static createEnemyFromDb(
    enemies: (typeof TB_dungeonEnemy.$inferSelect)[],
    db: PostgresJsDatabase
  ): Entity[][] {
    const entitiesByRound: Entity[][] = [];
    for (const enemy of enemies) {
      const entity = this.createEnemyFromKey(enemy.enemyKey, db);
      const current = entitiesByRound[enemy.inRound] || [];
      entitiesByRound[enemy.inRound] = [...current, entity];
    }

    return entitiesByRound;
  }

  static async createPlayerFromUser(
    userId: string,
    db: PostgresJsDatabase
  ): Promise<Entity> {
    const [player] = await db
      .select()
      .from(TB_player)
      .where(eq(TB_player.userId, userId));
    if (!player) {
      throw new Error("Player not found");
    }
    return this.createPlayer(player.id, db);
  }

  static async createPlayer(
    id: string,
    db: PostgresJsDatabase
  ): Promise<Entity> {
    const [player] = await db
      .select()
      .from(TB_player)
      .where(eq(TB_player.id, id));
    if (!player) {
      throw new Error("Player not found");
    }

    const spells = await db
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.playerId, player.id));

    const baseEntity = new BaseEntity(
      player.id,
      player.name,
      "TEAM_A",
      player.health,
      player.mana,
      {
        intelligence: player.intelligence,
        vitality: player.vitality,
        agility: player.agility,
        strength: player.strength,
      }
    );
    baseEntity.spells = spells.map((spell) => {
      switch (spell.type) {
        case "fireball":
          return new FireballSpell(spell.id);
        case "autoattack":
          return new AutoAttackSpell(spell.id);
        default:
          throw new Error(`Unknown spell type: ${spell.type}`);
      }
    });
    console.log(baseEntity);
    return baseEntity;
  }
}
