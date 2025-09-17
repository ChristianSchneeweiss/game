import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class WaterElemental extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `water-elemental-${nanoid()}`;
    super({
      id: realId,
      type: "water-elemental",
      name: "Water Elemental",
      team: "TEAM_B",
      maxHealth: 130,
      maxMana: 80,
      baseAttributes: {
        intelligence: 16,
        vitality: 14,
        agility: 9,
        strength: 6,
      },
      xp: 40,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "tidal-pulse",
            },
            dropRate: 0.06,
          },
          {
            type: "SPELL",
            data: {
              spellType: "stream-of-life",
            },
            dropRate: 0.06,
          },
        ],
        gold: 50,
      },
      spells: ["tidal-pulse", "stream-of-life", "basic-attack"],
    });
  }
}
