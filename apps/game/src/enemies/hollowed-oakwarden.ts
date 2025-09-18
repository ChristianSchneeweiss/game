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
      maxMana: 200,
      baseAttributes: {
        intelligence: 40,
        vitality: 26,
        agility: 10,
        strength: 18,
      },
      xp: 100, // Boss enemy, higher XP
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "verdant-smite",
            },
            dropRate: 0.01,
          },
          {
            type: "SPELL",
            data: {
              spellType: "natures-embrace",
            },
            dropRate: 0.01,
          },
        ],
        gold: 150, // Boss enemy, higher gold
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
