import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class SkeletonGrunt extends BaseEnemy {
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
      spells: ["crude-strike"],
    });
  }
}
