import { nanoid } from "nanoid";
import { BaseEntity } from "../base-entity";
import { AutoAttackSpell } from "../spells";

export class Goblin extends BaseEntity {
  constructor() {
    super(`goblin_${nanoid()}`, "Goblin", "TEAM_B", 20, 0, {
      intelligence: 1,
      vitality: 1,
      agility: 1,
      strength: 2,
    });
    this.spells = [new AutoAttackSpell(nanoid())];
  }
}
