import { nanoid } from "nanoid";
import { Enemy } from "../base-entity";
import { CrudeStrikeSpell } from "../spells/crude-strike";

export class SkeletonGrunt extends Enemy {
  constructor(id?: string) {
    const realId = id ?? `skeleton-grunt-${nanoid()}`;
    super({
      id: realId,
      type: "skeleton-grunt",
      name: "Skeleton Grunt",
      team: "TEAM_B",
      maxHealth: 45,
      maxMana: 0,
      baseAttributes: {
        intelligence: 2,
        vitality: 10,
        agility: 8,
        strength: 12,
      },
      xp: 20,
      loot: {
        items: [],
        gold: 20,
      },
    });

    this.spells = [new CrudeStrikeSpell(`crude-strike-${realId}`)];
  }
}
