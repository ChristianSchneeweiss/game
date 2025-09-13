import { nanoid } from "nanoid";
import { BasicAttackSpell } from "../spells/basic-attack";
import { SplinterShotSpell } from "../spells/splinter-shot";
import { BaseEnemy } from "./base/base.enemy";

export class AshenSkeleton extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `ashen-skeleton-${nanoid()}`;
    super({
      id: realId,
      type: "ashen-skeleton",
      name: "Ashen Skeleton",
      team: "TEAM_B",
      maxHealth: 50,
      maxMana: 0,
      baseAttributes: {
        intelligence: 3,
        vitality: 10,
        agility: 9,
        strength: 12,
      },
      xp: 20,
      loot: {
        items: [],
        gold: 20,
      },
    });

    this.spells = [
      new SplinterShotSpell(`splinter-shot-${realId}`),
      new BasicAttackSpell(`basic-attack-${realId}`),
    ];
  }
}
