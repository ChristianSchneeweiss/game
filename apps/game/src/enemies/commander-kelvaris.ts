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
      maxHealth: 280,
      maxMana: 120,
      baseAttributes: {
        strength: 18,
        vitality: 28,
        agility: 16, // DEX mapped to agility
        intelligence: 24,
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
      spells: ["torrent-spiral", "tidepiercer-thrust", "basic-attack"],
    });
  }
}
