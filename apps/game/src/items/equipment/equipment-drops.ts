import type { EnemyType } from "../../enemies/base/enemy-types";
import type { LootEntity } from "../../types";
import { defaultItemDropRate } from "../../utils/loot";
import { TIERED_EQUIPMENT, tieredEquipmentTypes } from "./tiered-equipment";

/** Add authored equipment sources alongside each enemy's existing loot. */
export function equipmentDropsForEnemy(enemy: EnemyType): LootEntity[] {
  return defaultItemDropRate(
    tieredEquipmentTypes.filter((type) => TIERED_EQUIPMENT[type].source === enemy),
  );
}
