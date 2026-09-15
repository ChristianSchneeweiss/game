import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { defaultSpellDropRate } from "../utils/loot";

export class WaterElemental extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `water-elemental-${nanoid()}`;
    super({
      id: realId,
      type: "water-elemental",
      name: "Water Elemental",
      team: "TEAM_B",
      maxHealth: 130,
      maxMana: 150,
      baseAttributes: {
        intelligence: 30,
        vitality: 13,
        agility: 9,
        strength: 6,
      },
      xp: 40,
      loot: {
        gold: 50,
        items: [
          ...defaultSpellDropRate(["tidal-pulse", "stream-of-life"]),
          { type: "ITEM", data: { itemType: "tideglass-staff" }, dropRate: 1 },
        ],
      },
      spells: ["tidal-pulse", "stream-of-life", "basic-attack"],
      passiveSkills: ["vital-wellspring"],
    });
  }
}
