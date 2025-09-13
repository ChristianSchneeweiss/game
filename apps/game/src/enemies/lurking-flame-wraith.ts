import { nanoid } from "nanoid";
import { BasicAttackSpell } from "../spells/basic-attack";
import { CinderbrandSpell } from "../spells/cinderbrand";
import { BaseEnemy } from "./base/base.enemy";

export class LurkingFlameWraith extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `lurking-flame-wraith-${nanoid()}`;
    super({
      id: realId,
      type: "lurking-flame-wraith",
      name: "Lurking Flame Wraith",
      team: "TEAM_B",
      maxHealth: 60,
      maxMana: 40,
      baseAttributes: {
        intelligence: 14,
        vitality: 6,
        agility: 11,
        strength: 4,
      },
      xp: 30,
      loot: {
        items: [],
        gold: 35,
      },
    });

    this.spells = [
      new CinderbrandSpell(`cinderbrand-${realId}`),
      new BasicAttackSpell(`basic-attack-${realId}`),
    ];
  }
}
