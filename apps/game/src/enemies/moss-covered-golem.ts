import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class MossCoveredGolem extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `moss-covered-golem-${nanoid()}`;
    super({
      id: realId,
      type: "moss-covered-golem",
      name: "Moss-Covered Golem",
      team: "TEAM_B",
      maxHealth: 90,
      maxMana: 25,
      baseAttributes: {
        intelligence: 5,
        vitality: 14,
        agility: 6,
        strength: 12,
      },
      xp: 30,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "crushing-blow",
            },
            dropRate: 0.1,
          },
        ],
        gold: 25,
      },
      spells: ["crushing-blow", "basic-attack"],
    });
  }
}
