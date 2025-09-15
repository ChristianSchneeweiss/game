import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class HollowedOakwarden extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `hollowed-oakwarden-${nanoid()}`;
    super({
      id: realId,
      type: "hollowed-oakwarden",
      name: "Hollowed Oakwarden",
      team: "TEAM_B",
      maxHealth: 260,
      maxMana: 50,
      baseAttributes: {
        intelligence: 16,
        vitality: 20,
        agility: 10,
        strength: 18,
      },
      xp: 100, // Boss enemy, higher XP
      loot: {
        items: [],
        gold: 150, // Boss enemy, higher gold
      },
      spells: ["verdant-smite", "natures-embrace", "basic-attack"],
    });
  }
}
