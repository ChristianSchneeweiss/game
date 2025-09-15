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
      maxMana: 50,
      baseAttributes: {
        intelligence: 15,
        vitality: 14,
        agility: 12,
        strength: 13,
      },
      xp: 100, // Higher XP for mini-boss
      loot: {
        items: [],
        gold: 100, // Higher gold for mini-boss
      },
      spells: ["charred-chains", "soulflare", "basic-attack"],
    });
  }
}
