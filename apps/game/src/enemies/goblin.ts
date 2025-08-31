import { nanoid } from "nanoid";
import { Enemy } from "../base-entity";
import { AutoAttackSpell } from "../spells/autoattack";

export class Goblin extends Enemy {
  constructor(id?: string) {
    super(
      id ?? `goblin_${nanoid()}`,
      "Goblin",
      "TEAM_B",
      20,
      0,
      {
        intelligence: 1,
        vitality: 1,
        agility: 1,
        strength: 2,
      },
      10,
      {
        items: [
          { type: "SPELL", data: { spellType: "fireball" }, dropRate: 0.2 },
          { type: "SPELL", data: { spellType: "single-heal" }, dropRate: 0.05 },
        ],
        gold: 10,
      }
    );

    this.spells = [new AutoAttackSpell(nanoid())];
  }
}
