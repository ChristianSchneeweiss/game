import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { defaultSpellDropRate } from "../utils/loot";

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
        gold: 30,
        items: [
          ...defaultSpellDropRate(["ocean-blessing", "aqua-wave"]),
          {
            type: "ITEM",
            data: { itemType: "tidewoven-robes" },
            dropRate: 0.25,
          },
        ],
      },
      spells: ["ocean-blessing", "aqua-wave", "basic-attack"],
    });
  }
}
