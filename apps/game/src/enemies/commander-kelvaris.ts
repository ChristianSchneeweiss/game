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
      maxMana: 40,
      baseAttributes: {
        strength: 18,
        vitality: 16,
        agility: 16, // DEX mapped to agility
        intelligence: 10,
      },
      xp: 150, // Boss XP reward
      loot: {
        items: [], // A-rank items can be added here
        gold: 100, // Boss gold reward
      },
      spells: ["torrent-spiral", "tidepiercer-thrust", "basic-attack"],
    });
  }
}
