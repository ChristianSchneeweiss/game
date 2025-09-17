import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class CryptCrawler extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `crypt-crawler-${nanoid()}`;
    super({
      id: realId,
      type: "crypt-crawler",
      name: "Crypt Crawler",
      team: "TEAM_B",
      maxHealth: 40,
      maxMana: 40,
      baseAttributes: {
        strength: 9,
        vitality: 8,
        agility: 15, // DEX maps to agility
        intelligence: 6,
      },
      xp: 25, // Reasonable XP for stage 3 enemy
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "precise-thrust",
            },
            dropRate: 0.2,
          },
        ],
        gold: 20, // Reasonable gold for stage 3 enemy
      },
      spells: ["precise-thrust", "basic-attack"],
    });
  }
}
