import { nanoid } from "nanoid";
import { BasicAttackSpell } from "../spells/basic-attack";
import { RootgraspSpell } from "../spells/rootgrasp";
import { BaseEnemy } from "./base/base.enemy";

export class ElderTreant extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `elder-treant-${nanoid()}`;
    super({
      id: realId,
      type: "elder-treant",
      name: "Elder Treant",
      team: "TEAM_B",
      maxHealth: 180,
      maxMana: 80,
      baseAttributes: {
        intelligence: 16,
        vitality: 18,
        agility: 6,
        strength: 16,
      },
      xp: 50,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "rootgrasp",
            },
            dropRate: 0.03,
          },
        ],
        gold: 75,
      },
      spells: ["rootgrasp", "basic-attack"],
    });
  }
}
