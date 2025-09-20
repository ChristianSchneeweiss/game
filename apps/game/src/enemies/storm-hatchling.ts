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
      maxHealth: 40,
      maxMana: 40,
      baseAttributes: {
        intelligence: 8,
        vitality: 8,
        agility: 18,
        strength: 8,
      },
      xp: 20,
      loot: {
        gold: 20,
      },
      spells: ["staggering-jab", "basic-attack"],
    });
  }
}
