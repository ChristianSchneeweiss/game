import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { defaultSpellDropRate } from "../utils/loot";

export class WispOfRegret extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `wisp-of-regret-${nanoid()}`;
    super({
      id: realId,
      type: "wisp-of-regret",
      name: "Wisp of Regret",
      team: "TEAM_B",
      maxHealth: 40,
      maxMana: 40,
      baseAttributes: {
        intelligence: 14,
        vitality: 6,
        agility: 12,
        strength: 3,
      },
      xp: 20,
      loot: {
        gold: 20,
        items: [
          ...defaultSpellDropRate(["cinder-wisp"]),
          { type: "ITEM", data: { itemType: "hollow-scepter" }, dropRate: 0.2 },
        ],
      },
      spells: ["cinder-wisp", "basic-attack"],
    });
  }
}
