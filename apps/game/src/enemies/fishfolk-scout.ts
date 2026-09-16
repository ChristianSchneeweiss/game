import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { defaultPassiveDropRate, defaultSpellDropRate } from "../utils/loot";

export class FishfolkScout extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `fishfolk-scout-${nanoid()}`;
    super({
      id: realId,
      type: "fishfolk-scout",
      name: "Fishfolk Scout",
      team: "TEAM_B",
      maxHealth: 55,
      maxMana: 30,
      baseAttributes: {
        intelligence: 6,
        vitality: 8,
        agility: 12,
        strength: 10,
      },
      xp: 25,
      loot: {
        gold: 25,
        items: [
          ...defaultSpellDropRate(["rupture", "crude-strike"]),
          ...defaultPassiveDropRate(["fleet-footed"]),
        ],
      },
      spells: ["rupture", "crude-strike", "basic-attack"],
    });
  }
}
