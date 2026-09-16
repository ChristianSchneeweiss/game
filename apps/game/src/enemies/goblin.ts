import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { getItemDefinition } from "../items/catalog";
import { defaultItemDropRate, defaultPassiveDropRate } from "../utils/loot";

export class Goblin extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `goblin-${nanoid()}`;
    super({
      id: realId,
      type: "goblin",
      name: "Goblin",
      team: "TEAM_B",
      maxHealth: 20,
      maxMana: 0,
      baseAttributes: {
        intelligence: 1,
        vitality: 1,
        agility: 1,
        strength: 2,
      },
      baseSpecialAttributes: {
        armor: 10,
        blessed: 5,
      },
      xp: 10,
      loot: {
        gold: 10,
        items: [
          ...defaultItemDropRate(["int-armor"]),
          ...defaultPassiveDropRate(["armor-up"]),
        ],
      },
      spells: ["basic-attack"],
      passiveSkills: ["armor-up"],
      equipment: ["int-armor"],
    });
    this.loot.items.push(
      ...defaultItemDropRate([getItemDefinition("healing-potion").type]),
    );
  }
}
