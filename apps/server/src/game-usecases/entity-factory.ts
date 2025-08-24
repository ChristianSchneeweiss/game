import { BaseEntity, Character, Enemy } from "@loot-game/game/base-entity";
import { Goblin } from "@loot-game/game/enemies/goblin";
import { AutoAttackSpell } from "@loot-game/game/spells/autoattack";
import { FireballSpell } from "@loot-game/game/spells/fireball";
import { SingleHealSpell } from "@loot-game/game/spells/Single-Heal";
import { ActionHooksFactory } from "@loot-game/game/trigger-hooks/Action-Hooks-Factory";
import { type Entity } from "@loot-game/game/types";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import {
  TB_actionSelectionHook,
  TB_character,
  TB_dungeonEnemy,
  TB_spellStats,
} from "../db/schema";

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

  static createEnemyFromKey(key: string, db: PostgresJsDatabase): Enemy {
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
        actionSelectionHooks: TB_actionSelectionHook,
      })
      .from(TB_character)
      .leftJoin(TB_spellStats, eq(TB_spellStats.equippedBy, TB_character.id))
      .leftJoin(
        TB_actionSelectionHook,
        eq(TB_actionSelectionHook.characterId, TB_character.id)
      )
      .where(eq(TB_character.id, id));

    if (rows.length === 0) {
      throw new Error("Player not found");
    }
    const character = rows[0].character;
    const spells = rows.map((row) => row.spellStats);
    const actionSelectionHooks = rows
      .map((row) => row.actionSelectionHooks)
      .filter((hook) => hook !== null);

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
          default:
            throw new Error(`Unknown spell type: ${spell.type}`);
        }
      });

    // todo not sure about this. maybe we should have it as a proper spell in TB_spellStats
    baseEntity.spells.push(new AutoAttackSpell(baseEntity.id));

    baseEntity.actionSelectionHooks = ActionHooksFactory.createActionHooks(
      [baseEntity],
      actionSelectionHooks
    );
    return baseEntity;
  }
}
