import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { defaultSpellDropRate } from "../utils/loot";

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
        gold: 20,
        items: [
          ...defaultSpellDropRate(["festering-blow"]),
          {
            type: "ITEM",
            data: { itemType: "stormrunner-leathers" },
            dropRate: 0.25,
          },
          {
            type: "PASSIVE",
            data: { passiveType: "predators-focus" },
            dropRate: 0.2,
          },
        ],
      },
      spells: ["festering-blow", "basic-attack"],
    });
  }
}
