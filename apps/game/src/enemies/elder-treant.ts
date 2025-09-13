import { nanoid } from "nanoid";
import { BasicAttackSpell } from "../spells/basic-attack";
import { RootgraspSpell } from "../spells/rootgrasp";
import { BaseEnemy } from "./base/base.enemy";

export class ElderTreant extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `elder-treant-${nanoid()}`;
    super({
      id: realId,
      type: "elder-treant",
      name: "Elder Treant",
      team: "TEAM_B",
      maxHealth: 180,
      maxMana: 30,
      baseAttributes: {
        intelligence: 10,
        vitality: 18,
        agility: 6,
        strength: 16,
      },
      xp: 50,
      loot: {
        items: [],
        gold: 75,
      },
    });

    this.spells = [
      new RootgraspSpell(`rootgrasp-${realId}`),
      new BasicAttackSpell(`basic-attack-${realId}`),
    ];
  }
}
