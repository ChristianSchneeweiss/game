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
      maxHealth: 150,
      maxMana: 150,
      baseAttributes: {
        intelligence: 30,
        vitality: 14,
        agility: 12,
        strength: 25,
      },
      xp: 100, // Higher XP for mini-boss
      loot: {
        gold: 100, // Higher gold for mini-boss
      },
      spells: ["charred-chains", "soulflare", "basic-attack"],
      passiveSkills: ["soulleech"],
    });
  }
}
