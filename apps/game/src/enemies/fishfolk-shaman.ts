import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class FishfolkShaman extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `fishfolk-shaman-${nanoid()}`;
    super({
      id: realId,
      type: "fishfolk-shaman",
      name: "Fishfolk Shaman",
      team: "TEAM_B",
      maxHealth: 60,
      maxMana: 70,
      baseAttributes: {
        intelligence: 14,
        vitality: 10,
        agility: 8,
        strength: 5,
      },
      xp: 30,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "ocean-blessing",
            },
            dropRate: 0.06,
          },
        ],
        gold: 30,
      },
      spells: ["ocean-blessing", "basic-attack"],
    });
  }
}
