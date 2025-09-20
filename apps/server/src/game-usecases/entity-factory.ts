import { Character } from "@loot-game/game/base-entity";
import type { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import type { EnemyType } from "@loot-game/game/enemies/base/enemy-types";
import type { Equipped } from "@loot-game/game/entity-types";
import { itemFactory } from "@loot-game/game/items/equipment/item-factory";
import { passiveSkillFactory } from "@loot-game/game/passive-skills/base/passive-skill.factory";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import { BasicAttackSpell } from "@loot-game/game/spells/basic-attack";
import { eq, ilike } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  TB_character,
  TB_dungeonEnemy,
  TB_equipmentStats,
  TB_passivSkillStats,
  TB_spellStats,
  type Database,
} from "../db/schema";
import { createEnemyFromType } from "./enemy-factory";

export class EntityFactory {
  static createEnemyFromType(type: EnemyType, id?: string): BaseEnemy {
    return createEnemyFromType(type, id);
  }

  static createEnemyFromDb(
    enemies: (typeof TB_dungeonEnemy.$inferSelect)[]
  ): BaseEnemy[][] {
    const entitiesByRound: BaseEnemy[][] = [];
    for (const enemy of enemies) {
      const entity = this.createEnemyFromType(enemy.type, enemy.id);
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

  static async createCharacter(id: string, db: Database): Promise<Character> {
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

    const passiveSkills = await db
      .select()
      .from(TB_passivSkillStats)
      .where(eq(TB_passivSkillStats.equippedBy, id));

    const equipmentStats = await db
      .select()
      .from(TB_equipmentStats)
      .where(eq(TB_equipmentStats.equippedBy, id));

    const baseEntity = new Character(
      character.id,
      character.userId,
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
      .map((spell) => createSpellFromType(spell.id, spell.type));

    // todo not sure about this. maybe we should have it as a proper spell in TB_spellStats
    baseEntity.spells.push(new BasicAttackSpell(baseEntity.id));

    baseEntity.passiveSkills = passiveSkills
      .filter((passive) => passive !== null)
      .map((passive) =>
        passiveSkillFactory(passive.type, passive.id, baseEntity)
      );

    baseEntity.equipped = equipmentStats.reduce((acc, equip) => {
      const equipment = itemFactory(equip.type, baseEntity, equip.id);
      acc[equipment.equipmentSlot] = equipment;
      return acc;
    }, {} as Equipped);

    return baseEntity;
  }

  static async searchCharacters(query: string, db: PostgresJsDatabase) {
    const charactersDb = await db
      .select()
      .from(TB_character)
      .where(ilike(TB_character.name, `%${query}%`));

    return Promise.all(
      charactersDb.map((character) => this.createCharacter(character.id, db))
    );
  }
}
