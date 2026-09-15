import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { defaultSpellDropRate } from "../utils/loot";

export class Thundermaw extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `thundermaw-${nanoid()}`;
    super({
      id: realId,
      type: "thundermaw",
      name: "Thundermaw",
      team: "TEAM_B",
      maxHealth: 300,
      maxMana: 200,
      baseAttributes: {
        intelligence: 40,
        vitality: 30,
        agility: 14,
        strength: 28,
      },
      xp: 100,
      loot: {
        gold: 50,
        items: [
          ...defaultSpellDropRate([
            "volt-lash",
            "lightning-surge",
            "festering-blow",
          ]),
          { type: "ITEM", data: { itemType: "stormfang-blade" }, dropRate: 1 },
        ],
      },
      spells: [
        "volt-lash",
        "lightning-surge",
        "festering-blow",
        "basic-attack",
      ],
      passiveSkills: ["thorn-carapace"],
    });
  }
}
