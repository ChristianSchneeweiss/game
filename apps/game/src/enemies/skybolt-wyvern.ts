import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import {
  defaultItemDropRate,
  defaultPassiveDropRate,
  defaultSpellDropRate,
} from "../utils/loot";

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
          ...defaultItemDropRate(["stormrunner-leathers"]),
          ...defaultPassiveDropRate(["predators-focus"]),
        ],
      },
      spells: ["festering-blow", "basic-attack"],
    });
  }
}
