import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class BarkhideShaman extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `barkhide-shaman-${nanoid()}`;
    super({
      id: realId,
      type: "barkhide-shaman",
      name: "Barkhide Shaman",
      team: "TEAM_B",
      maxHealth: 60,
      maxMana: 70,
      baseAttributes: {
        intelligence: 14,
        vitality: 10,
        agility: 8,
        strength: 6,
      },
      xp: 25,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "stone-bark",
            },
            dropRate: 0.06,
          },
        ],
        gold: 20,
      },
      spells: ["stone-bark", "basic-attack"],
    });
  }
}
