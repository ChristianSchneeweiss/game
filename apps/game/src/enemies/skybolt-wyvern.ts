import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class SkyboltWyvern extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `skybolt-wyvern-${nanoid()}`;
    super({
      id: realId,
      type: "skybolt-wyvern",
      name: "Skybolt Wyvern",
      team: "TEAM_B",
      maxHealth: 35,
      maxMana: 50,
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
              spellType: "festering-blow",
            },
            dropRate: 0.2,
          },
        ],
        gold: 20,
      },
      spells: ["festering-blow", "basic-attack"],
    });
  }
}
