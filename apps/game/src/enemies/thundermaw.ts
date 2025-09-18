import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

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
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "volt-lash",
            },
            dropRate: 0.01,
          },
          {
            type: "SPELL",
            data: {
              spellType: "lightning-surge",
            },
            dropRate: 0.01,
          },
        ],
        gold: 50,
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
