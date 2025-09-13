import { nanoid } from "nanoid";
import { BasicAttackSpell } from "../spells/basic-attack";
import { CrushingBlowSpell } from "../spells/crushing-blow";
import { BaseEnemy } from "./base/base.enemy";

export class MossCoveredGolem extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `moss-covered-golem-${nanoid()}`;
    super({
      id: realId,
      type: "moss-covered-golem",
      name: "Moss-Covered Golem",
      team: "TEAM_B",
      maxHealth: 90,
      maxMana: 0,
      baseAttributes: {
        intelligence: 5,
        vitality: 14,
        agility: 6,
        strength: 12,
      },
      xp: 30,
      loot: {
        items: [],
        gold: 25,
      },
    });

    this.spells = [
      new CrushingBlowSpell(`crushing-blow-${realId}`),
      new BasicAttackSpell(`basic-attack-${realId}`),
    ];
  }
}
