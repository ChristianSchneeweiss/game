import { nanoid } from "nanoid";
import { BasicAttackSpell } from "../spells/basic-attack";
import { StoneBarkSpell } from "../spells/stone-bark";
import { BaseEnemy } from "./base/base.enemy";

export class BarkhideShaman extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `barkhide-shaman-${nanoid()}`;
    super({
      id: realId,
      type: "barkhide-shaman",
      name: "Barkhide Shaman",
      team: "TEAM_B",
      maxHealth: 60,
      maxMana: 40,
      baseAttributes: {
        intelligence: 14,
        vitality: 10,
        agility: 8,
        strength: 6,
      },
      xp: 25,
      loot: {
        items: [],
        gold: 20,
      },
    });

    this.spells = [
      new StoneBarkSpell(`stone-bark-${realId}`),
      new BasicAttackSpell(`basic-attack-${realId}`),
    ];
  }
}
