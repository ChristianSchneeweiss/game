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
      maxHealth: 100,
      maxMana: 40,
      baseAttributes: {
        strength: 10,
        vitality: 12,
        agility: 18, // DEX maps to agility
        intelligence: 14,
      },
      xp: 50, // Higher XP for mini-boss
      loot: {
        items: [],
        gold: 75, // Higher gold for mini-boss
      },
      spells: ["storm-pulse", "battle-roar", "basic-attack"],
    });
  }
}
