import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class Goblin extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `goblin-${nanoid()}`;
    super({
      id: realId,
      type: "goblin",
      name: "Goblin",
      team: "TEAM_B",
      maxHealth: 200,
      maxMana: 0,
      baseAttributes: {
        intelligence: 1,
        vitality: 1,
        agility: 1,
        strength: 2,
      },
      baseSpecialAttributes: {
        armor: 10,
      },
      xp: 10,
      loot: {
        items: [
          { type: "SPELL", data: { spellType: "fireball" }, dropRate: 0.2 },
          { type: "SPELL", data: { spellType: "single-heal" }, dropRate: 0.05 },
        ],
        gold: 10,
      },
      spells: ["basic-attack"],
      passiveSkills: ["armor-up", "mirror"],
    });
  }
}
