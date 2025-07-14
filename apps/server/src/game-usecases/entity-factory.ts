import { BaseEntity, Character } from "@loot-game/game/base-entity";
import { Goblin } from "@loot-game/game/enemies/goblin";
import { AutoAttackSpell } from "@loot-game/game/spells/autoattack";
import { FireballSpell } from "@loot-game/game/spells/fireball";
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
    const characters: Character[] = [];
    for (const character of charactersDb) {
      characters.push(await this.createCharacter(character.id, db));
    }
    return characters;
  }

  static async createCharacter(
    id: string,
    db: PostgresJsDatabase
  ): Promise<Character> {
    const [character] = await db
      .select()
      .from(TB_character)
      .where(eq(TB_character.id, id));
    if (!character) {
      throw new Error("Player not found");
    }

    const spells = await db
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.equippedBy, id));

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
      character.level
    );
    baseEntity.spells = spells.map((spell) => {
      switch (spell.type) {
        case "fireball":
          return new FireballSpell(spell.id);
        default:
          throw new Error(`Unknown spell type: ${spell.type}`);
      }
    });

    // todo not sure about this. maybe we should have it as a proper spell in TB_spellStats
    baseEntity.spells.push(new AutoAttackSpell(baseEntity.id));
    return baseEntity;
  }
}
