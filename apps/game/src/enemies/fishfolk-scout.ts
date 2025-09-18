import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class FishfolkScout extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `fishfolk-scout-${nanoid()}`;
    super({
      id: realId,
      type: "fishfolk-scout",
      name: "Fishfolk Scout",
      team: "TEAM_B",
      maxHealth: 55,
      maxMana: 30,
      baseAttributes: {
        intelligence: 6,
        vitality: 8,
        agility: 12,
        strength: 10,
      },
      xp: 25,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "rupture",
            },
            dropRate: 0.06,
          },
          {
            type: "SPELL",
            data: {
              spellType: "crude-strike",
            },
            dropRate: 0.2,
          },
        ],
        gold: 25,
      },
      spells: ["rupture", "crude-strike", "basic-attack"],
    });
  }
}
