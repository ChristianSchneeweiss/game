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
    const bonuses = item.bonuses
      .map(
        ({ attribute, value }) =>
          `${attribute} ${value >= 0 ? "+" : ""}${value}`,
      )
      .join(", ");
    return [
      type,
      estimateMight(
        references[item.equipmentSlot],
        item.might,
        `Author estimate relative to the slot's reference anchor: ${item.description} Additive bonuses: ${bonuses}. Value the whole item in a suitable build, including its attack profile if a weapon. Do not add unlike stats as a score or credit unused recovery. Not yet measured in paired encounter probes.`,
      ),
    ];
  }),
) as Record<TieredEquipmentType, MightAssessment>;
