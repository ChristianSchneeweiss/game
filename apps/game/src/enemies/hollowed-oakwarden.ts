import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { defaultSpellDropRate } from "../utils/loot";

export class HollowedOakwarden extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `hollowed-oakwarden-${nanoid()}`;
    super({
      id: realId,
      type: "hollowed-oakwarden",
      name: "Hollowed Oakwarden",
      team: "TEAM_B",
      maxHealth: 260,
      maxMana: 200,
      baseAttributes: {
        intelligence: 40,
        vitality: 26,
        agility: 10,
        strength: 18,
      },
      xp: 100, // Boss enemy, higher XP
      loot: {
        gold: 150, // Boss enemy, higher gold
        items: [
          ...defaultSpellDropRate(["verdant-smite", "festering-blow"]),
          {
            type: "SPELL",
            data: { spellType: "natures-embrace" },
            dropRate: 1,
          },
          { type: "ITEM", data: { itemType: "oakwarden-staff" }, dropRate: 1 },
        ],
      },
      spells: [
        "verdant-smite",
        "natures-embrace",
        "festering-blow",
        "basic-attack",
      ],
      passiveSkills: ["blessed-fortune", "titans-resurgence"],
    });
  }
}
