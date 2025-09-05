import {
  BaseEntity,
  Character,
  Enemy,
  type EnemyType,
} from "@loot-game/game/base-entity";
import { Goblin } from "@loot-game/game/enemies/goblin";
import { AutoAttackSpell } from "@loot-game/game/spells/autoattack";
import { CrudeStrikeSpell } from "@loot-game/game/spells/crude-strike";
import { FesteringBlowSpell } from "@loot-game/game/spells/festering-blow";
import { FireballSpell } from "@loot-game/game/spells/fireball";
import { SingleHealSpell } from "@loot-game/game/spells/single-heal";
import { type Entity } from "@loot-game/game/types";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import { TB_character, TB_dungeonEnemy, TB_spellStats } from "../db/schema";

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

  static createEnemyFromType(type: EnemyType, db: PostgresJsDatabase): Enemy {
    switch (type) {
      case "goblin":
        const goblin = new Goblin();
        return goblin;
      default:
        throw new Error(`Unknown enemy type: ${type}`);
    }
  }

  static createEnemyFromDb(
    enemies: (typeof TB_dungeonEnemy.$inferSelect)[],
    db: PostgresJsDatabase
  ): Enemy[][] {
    const entitiesByRound: Enemy[][] = [];
    for (const enemy of enemies) {
      const entity = this.createEnemyFromType(enemy.type, db);
      entity.id = enemy.id;
      const current = entitiesByRound[enemy.inRound] || [];
      entitiesByRound[enemy.inRound] = [...current, entity];
    }

    return entitiesByRound;
  }

  static async createCharactersFromUser(
    userId: string,
    db: PostgresJsDatabase
  ): Promise<Character[]> {
    const charactersDb = await db
      .select()
      .from(TB_character)
      .where(eq(TB_character.userId, userId));

    if (charactersDb.length === 0) {
      throw new Error("No characters found");
    }
    const characters: Character[] = await Promise.all(
      charactersDb.map((character) => this.createCharacter(character.id, db))
    );
    return characters;
  }

  static async createCharacter(
    id: string,
    db: PostgresJsDatabase
  ): Promise<Character> {
    const rows = await db
      .select({
        character: TB_character,
        spellStats: TB_spellStats,
      })
      .from(TB_character)
      .leftJoin(TB_spellStats, eq(TB_spellStats.equippedBy, TB_character.id))
      .where(eq(TB_character.id, id));

    if (rows.length === 0) {
      throw new Error("Player not found");
    }
    const character = rows[0].character;
    const spells = rows.map((row) => row.spellStats);

    const baseEntity = new Character(
      character.id,
      character.name,
      "TEAM_A",
      character.health,
      character.mana,
      {
        intelligence: character.intelligence,
        vitality: character.vitality,
        agility: character.agility,
        strength: character.strength,
      },
      character.xp,
      character.level,
      character.statPointsAvailable
    );
    baseEntity.spells = spells
      .filter((spell) => spell !== null)
      .map((spell) => {
        switch (spell.type) {
          case "fireball":
            return new FireballSpell(spell.id);
          case "single-heal":
            return new SingleHealSpell(spell.id);
          case "crude-strike":
            return new CrudeStrikeSpell(spell.id);
          case "festering-blow":
            return new FesteringBlowSpell(spell.id);
          default:
            throw new Error(`Unknown spell type: ${spell.type}`);
        }
      });

    // todo not sure about this. maybe we should have it as a proper spell in TB_spellStats
    baseEntity.spells.push(new AutoAttackSpell(baseEntity.id));

    return baseEntity;
  }
}
