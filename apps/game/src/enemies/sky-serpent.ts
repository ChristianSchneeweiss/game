import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class SkySerpent extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `sky-serpent-${nanoid()}`;
    super({
      id: realId,
      type: "sky-serpent",
      name: "Sky Serpent",
      team: "TEAM_B",
      maxHealth: 180,
      maxMana: 70,
      baseAttributes: {
        strength: 24,
        vitality: 18,
        agility: 18, // DEX maps to agility
        intelligence: 14,
      },
      xp: 50, // Higher XP for mini-boss
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "storm-pulse",
            },
            dropRate: 0.06,
          },
          {
            type: "SPELL",
            data: {
              spellType: "battle-roar",
            },
            dropRate: 0.06,
          },
        ],
        gold: 75, // Higher gold for mini-boss
      },
      spells: ["storm-pulse", "battle-roar", "festering-blow", "basic-attack"],
      passiveSkills: ["mystic-flow"],
    });
  }
}
