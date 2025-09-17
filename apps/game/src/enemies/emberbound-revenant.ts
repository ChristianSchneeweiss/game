import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class EmberboundRevenant extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `emberbound-revenant-${nanoid()}`;
    super({
      id: realId,
      type: "emberbound-revenant",
      name: "Emberbound Revenant",
      team: "TEAM_B",
      maxHealth: 130,
      maxMana: 120,
      baseAttributes: {
        intelligence: 24,
        vitality: 14,
        agility: 12,
        strength: 13,
      },
      xp: 100, // Higher XP for mini-boss
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "charred-chains",
            },
            dropRate: 0.1,
          },
          {
            type: "SPELL",
            data: {
              spellType: "soulflare",
            },
            dropRate: 0.06,
          },
        ],
        gold: 100, // Higher gold for mini-boss
      },
      spells: ["charred-chains", "soulflare", "basic-attack"],
    });
  }
}
