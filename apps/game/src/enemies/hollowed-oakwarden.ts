import { nanoid } from "nanoid";
import { BasicAttackSpell } from "../spells/basic-attack";
import { NaturesEmbrace } from "../spells/natures-embrace";
import { VerdantSmiteSpell } from "../spells/verdant-smite";
import { BaseEnemy } from "./base/base.enemy";

export class HollowedOakwarden extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `hollowed-oakwarden-${nanoid()}`;
    super({
      id: realId,
      type: "hollowed-oakwarden",
      name: "Hollowed Oakwarden",
      team: "TEAM_B",
      maxHealth: 260,
      maxMana: 50,
      baseAttributes: {
        intelligence: 16,
        vitality: 20,
        agility: 10,
        strength: 18,
      },
      xp: 100, // Boss enemy, higher XP
      loot: {
        items: [],
        gold: 150, // Boss enemy, higher gold
      },
    });

    this.spells = [
      new VerdantSmiteSpell(`verdant-smite-${realId}`),
      new NaturesEmbrace(`natures-embrace-${realId}`),
      new BasicAttackSpell(`basic-attack-${realId}`),
    ];
  }
}
