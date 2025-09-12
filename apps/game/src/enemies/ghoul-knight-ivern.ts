import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { BasicAttackSpell } from "../spells/basic-attack";
import { FesteringBlowSpell } from "../spells/festering-blow";
import { VitalStrikeSpell } from "../spells/vital-strike";

export class GhoulKnightIvern extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `ghoul-knight-ivern-${nanoid()}`;
    super({
      id: realId,
      type: "ghoul-knight-ivern",
      name: "Ghoul Knight Ivern",
      team: "TEAM_B",
      maxHealth: 150,
      maxMana: 20,
      baseAttributes: {
        intelligence: 6,
        vitality: 14,
        agility: 10,
        strength: 16,
      },
      xp: 50,
      loot: {
        items: [],
        gold: 40,
      },
    });

    this.spells = [
      new VitalStrikeSpell(`vital-strike-${realId}`),
      new FesteringBlowSpell(`festering-blow-${realId}`),
      new BasicAttackSpell(`basic-attack-${realId}`),
    ];
  }
}
