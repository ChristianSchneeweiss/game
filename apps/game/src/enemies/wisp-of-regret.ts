import { nanoid } from "nanoid";
import { Enemy } from "../base-entity";
import { AutoAttackSpell } from "../spells/basic-attack";
import { CinderWispSpell } from "../spells/cinder-wisp";

export class WispOfRegret extends Enemy {
  constructor(id?: string) {
    const realId = id ?? `wisp-of-regret-${nanoid()}`;
    super({
      id: realId,
      type: "wisp-of-regret",
      name: "Wisp of Regret",
      team: "TEAM_B",
      maxHealth: 40,
      maxMana: 40,
      baseAttributes: {
        intelligence: 14,
        vitality: 6,
        agility: 12,
        strength: 3,
      },
      xp: 20,
      loot: {
        items: [],
        gold: 20,
      },
    });

    this.spells = [
      new CinderWispSpell(`cinder-wisp-${realId}`),
      new AutoAttackSpell(`autoattack-${realId}`),
    ];
  }
}
