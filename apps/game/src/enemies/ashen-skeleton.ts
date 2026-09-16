import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { getItemDefinition } from "../items/catalog";
import { defaultItemDropRate, defaultSpellDropRate } from "../utils/loot";

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
        gold: 20,
        items: defaultSpellDropRate(["splinter-shot"]),
      },
      spells: ["splinter-shot", "crude-strike", "basic-attack"],
    });
    this.loot.items.push(
      ...defaultItemDropRate([getItemDefinition("bone-shard").type]),
    );
  }
}
