import { nanoid } from "nanoid";
import { BasicAttackSpell } from "../spells/basic-attack";
import { CharredChainsSpell } from "../spells/charred-chains";
import { SoulflareSpell } from "../spells/soulflare";
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
    });

    this.spells = [
      new CharredChainsSpell(`charred-chains-${realId}`),
      new SoulflareSpell(`soulflare-${realId}`),
      new BasicAttackSpell(`basic-attack-${realId}`),
    ];
  }
}
