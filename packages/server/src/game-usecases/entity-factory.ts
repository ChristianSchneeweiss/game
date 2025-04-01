import { nanoid } from "nanoid";
import { BaseEntity } from "@loot-game/game/base-entity";
import type { Entity } from "@loot-game/game/types";
import { FireballSpell } from "@loot-game/game/spells/fireball";
import { AutoAttackSpell } from "@loot-game/game/spells";

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

  static createPlayer(id: string): Entity {
    const baseEntity = new BaseEntity(id, "chiller", "TEAM_A", 100, 100, {
      intelligence: 20,
      vitality: 20,
      agility: 20,
      strength: 20,
    });
    baseEntity.spells = [
      new FireballSpell(nanoid()),
      new AutoAttackSpell(nanoid()),
    ];
    return baseEntity;
  }
}
