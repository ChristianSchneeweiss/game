import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class RottingCorpse extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `rotting-corpse-${nanoid()}`;
    super({
      id: realId,
      type: "rotting-corpse",
      name: "Rotting Corpse",
      team: "TEAM_B",
      maxHealth: 60,
      maxMana: 0,
      baseAttributes: {
        intelligence: 2,
        vitality: 12,
        agility: 6,
        strength: 14,
      },
      xp: 20,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "festering-blow",
            },
            dropRate: 0.2,
          },
        ],
        gold: 20,
      },
      spells: ["festering-blow", "basic-attack"],
    });
  }
}
