import { nanoid } from "nanoid";
import { BaseEntity } from "./base-entity";
import type { Entity } from "./types";
import { FireballSpell } from "./spells/fireball";
import { AutoAttackSpell } from "./spells";

export class EntityFactory {
  static createEnemy(): Entity {
    const baseEntity = new BaseEntity(nanoid(), "Goblin", "TEAM_B");
    baseEntity.maxHealth = 30;
    baseEntity.health = 30;
    baseEntity.spells = [
      new FireballSpell(nanoid()),
      new AutoAttackSpell(nanoid()),
    ];
    return baseEntity;
  }

  static createPlayer(id: string): Entity {
    const baseEntity = new BaseEntity(id, "chiller", "TEAM_A");
    baseEntity.baseAttributes.intelligence = 20;
    baseEntity.spells = [
      new FireballSpell(nanoid()),
      new AutoAttackSpell(nanoid()),
    ];
    return baseEntity;
  }
}
