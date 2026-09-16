import { BaseEnemy } from "../../../apps/game/src/enemies/base/base.enemy";
import { getItemDefinition } from "../../../apps/game/src/items/catalog";
import {
  CONSUMABLE_DEFINITIONS,
  MATERIAL_DEFINITIONS,
} from "../../../apps/game/src/items/stackable-catalog";
import type { LootEntity } from "../../../apps/game/src/types";

/** Isolated authoring fixtures. Never imported by a production entry point. */
export function installItemFixtures() {
  MATERIAL_DEFINITIONS["test-material"] = {
    name: "Test Material",
    description: "An isolated material for inventory verification.",
    tier: "B",
  };
  CONSUMABLE_DEFINITIONS["test-supply"] = {
    name: "Test Supply",
    description: "An isolated supply with no implemented effect.",
    tier: "C",
    useContexts: ["battle", "outside-battle"],
    restoration: { resource: "health", amount: 40 },
  };
  const material = getItemDefinition("test-material");
  const consumable = getItemDefinition("test-supply");
  if (material.kind !== "material" || consumable.kind !== "consumable")
    throw new Error("Invalid item fixtures");
  return {
    material,
    consumable,
    restore() {
      delete MATERIAL_DEFINITIONS["test-material"];
      delete CONSUMABLE_DEFINITIONS["test-supply"];
    },
  };
}

export function itemFixtureEnemy(items: LootEntity[]) {
  return new BaseEnemy({
    id: "test-item-enemy",
    type: "ashen-skeleton",
    name: "Item fixture enemy",
    team: "TEAM_B",
    maxHealth: 100,
    maxMana: 50,
    baseAttributes: {
      strength: 10,
      intelligence: 10,
      vitality: 10,
      agility: 10,
    },
    xp: 1,
    spells: [],
    loot: { gold: 0, items },
  });
}
