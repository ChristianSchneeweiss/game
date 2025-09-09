import { nanoid } from "nanoid";
import { Enemy } from "../base-entity";
import { AutoAttackSpell } from "../spells/autoattack";

export class Goblin extends Enemy {
  constructor(id?: string) {
    super({
      id: id ?? `goblin-${nanoid()}`,
      type: "goblin",
      name: "Goblin",
      team: "TEAM_B",
      maxHealth: 20,
      maxMana: 0,
      baseAttributes: {
        intelligence: 1,
        vitality: 1,
        agility: 1,
        strength: 2,
      },
      xp: 10,
      loot: {
        items: [
          { type: "SPELL", data: { spellType: "fireball" }, dropRate: 0.2 },
          { type: "SPELL", data: { spellType: "single-heal" }, dropRate: 0.05 },
        ],
        gold: 10,
      },
    });

    this.spells = [new AutoAttackSpell(nanoid())];
  }
}
