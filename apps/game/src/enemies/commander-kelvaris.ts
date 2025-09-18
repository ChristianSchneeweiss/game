import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class CommanderKelvaris extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `commander-kelvaris-${nanoid()}`;
    super({
      id: realId,
      type: "commander-kelvaris",
      name: "Commander Kelvaris, Tidepiercer",
      team: "TEAM_B",
      maxHealth: 220,
      maxMana: 130,
      baseAttributes: {
        strength: 38,
        vitality: 22,
        agility: 30, // DEX mapped to agility
        intelligence: 26,
      },
      xp: 150, // Boss XP reward
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "torrent-spiral",
            },
            dropRate: 0.01,
          },
          {
            type: "SPELL",
            data: {
              spellType: "tidepiercer-thrust",
            },
            dropRate: 0.01,
          },
        ],
        gold: 100,
      },
      spells: [
        "torrent-spiral",
        "tidepiercer-thrust",
        "vital-strike",
        "basic-attack",
      ],
      passiveSkills: ["keen-instincts"],
    });
  }
}
