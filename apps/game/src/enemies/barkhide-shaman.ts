import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { getItemDefinition } from "../items/catalog";
import {
  defaultItemDropRate,
  defaultPassiveDropRate,
  defaultSpellDropRate,
} from "../utils/loot";

export class BarkhideShaman extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `barkhide-shaman-${nanoid()}`;
    super({
      id: realId,
      type: "barkhide-shaman",
      name: "Barkhide Shaman",
      team: "TEAM_B",
      maxHealth: 60,
      maxMana: 70,
      baseAttributes: {
        intelligence: 14,
        vitality: 10,
        agility: 8,
        strength: 6,
      },
      xp: 25,
      loot: {
        gold: 20,
        items: [
          ...defaultSpellDropRate(["stone-bark", "splinter-shot"]),
          ...defaultPassiveDropRate(["merciful-light"]),
        ],
      },
      spells: ["stone-bark", "splinter-shot", "basic-attack"],
    });
    this.loot.items.push(
      ...defaultItemDropRate([
        getItemDefinition("healing-potion").type,
        getItemDefinition("living-resin").type,
      ]),
    );
  }
}
