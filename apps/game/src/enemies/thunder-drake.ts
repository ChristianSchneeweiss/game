import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class ThunderDrake extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `thunder-drake-${nanoid()}`;
    super({
      id: realId,
      type: "thunder-drake",
      name: "Thunder Drake",
      team: "TEAM_B",
      maxHealth: 150,
      maxMana: 50,
      baseAttributes: {
        intelligence: 10,
        vitality: 15,
        agility: 12,
        strength: 20,
      },
      xp: 40,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "stunning-strike",
            },
            dropRate: 0.06,
          },
        ],
        gold: 50,
      },
      spells: ["stunning-strike", "festering-blow", "basic-attack"],
    });
  }
}
