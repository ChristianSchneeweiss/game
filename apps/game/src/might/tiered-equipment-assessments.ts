import { tieredEquipmentRationales } from "./tiered-equipment-rationales";
import {
  TIERED_EQUIPMENT,
  tieredEquipmentTypes,
  type TieredEquipmentType,
} from "../items/equipment/tiered-equipment";
import type { EquipmentSlot } from "../items/equipment/equipment";
import type { MightAssessment } from "./might";
import { estimateMight } from "./references";

const references = {
  WEAPON: "weapons",
  ARMOR: "armor",
  RING: "ring",
  AMULET: "amulet",
  BOOTS: "boots",
  GLOVES: "gloves",
  HELMET: "helmet",
  CLOAK: "cloak",
  BELT: "belt",
} as const satisfies Record<EquipmentSlot, Parameters<typeof estimateMight>[0]>;

export const tieredEquipmentAssessments = Object.fromEntries(
  tieredEquipmentTypes.map((type) => {
    const item = TIERED_EQUIPMENT[type];
    return [
      type,
      estimateMight(
        references[item.equipmentSlot],
        item.might,
        tieredEquipmentRationales[type],
      ),
    ];
  }),
) as Record<TieredEquipmentType, MightAssessment>;
