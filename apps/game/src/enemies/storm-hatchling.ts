import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class StormHatchling extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `storm-hatchling-${nanoid()}`;
    super({
      id: realId,
      type: "storm-hatchling",
      name: "Storm Hatchling",
      team: "TEAM_B",
      maxHealth: 35,
      maxMana: 40,
      baseAttributes: {
        intelligence: 8,
        vitality: 6,
        agility: 14,
        strength: 8,
      },
      xp: 20,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "staggering-jab",
            },
            dropRate: 0.2,
          },
        ],
        gold: 20,
      },
      spells: ["staggering-jab", "basic-attack"],
    });
  }
}
