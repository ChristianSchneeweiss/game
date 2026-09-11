import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class ElderTreant extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `elder-treant-${nanoid()}`;
    super({
      id: realId,
      type: "elder-treant",
      name: "Elder Treant",
      team: "TEAM_B",
      maxHealth: 180,
      maxMana: 80,
      baseAttributes: {
        intelligence: 16,
        vitality: 18,
        agility: 6,
        strength: 16,
      },
      xp: 50,
      loot: {
        gold: 75,
        items: [
          { type: "ITEM", data: { itemType: "iron-cuirass" }, dropRate: 1 },
        ],
      },
      spells: ["rootgrasp", "crushing-blow", "basic-attack"],
      passiveSkills: ["stoneform-resolve"],
    });
  }
}
