import { nanoid } from "nanoid";
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
      maxMana: 15,
      baseAttributes: {
        intelligence: 3,
        vitality: 10,
        agility: 9,
        strength: 12,
      },
      xp: 20,
      loot: {
        items: [
          {
            type: "SPELL",
            data: {
              spellType: "splinter-shot",
            },
            dropRate: 0.2,
          },
        ],
        gold: 20,
      },
      spells: ["splinter-shot", "basic-attack"],
    });
  }
}
