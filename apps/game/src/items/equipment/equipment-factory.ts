import type { Entity } from "../../entity-types";
import { EquipmentTypeSchema, type EquipmentType } from "../equipment-types";
import { IntArmor } from "./int-armor";
import { Equipment } from "./equipment";
import { EQUIPMENT_DEFINITIONS } from "./equipment-catalog";

export const equipmentFactory = (
  itemType: EquipmentType,
  id: string,
  holder: Pick<Entity, "id">,
): Equipment => {
  EquipmentTypeSchema.parse(itemType);
  if (itemType === "int-armor") return new IntArmor({ holder, id });
  const definition = EQUIPMENT_DEFINITIONS[itemType];
  if (!definition) throw new Error(`Unsupported item type: ${itemType}`);
  return new Equipment({
    id,
    itemType,
    holderId: holder.id,
    name: definition.name,
    description: definition.description,
    equipmentSlot: definition.equipmentSlot,
    tier: definition.tier,
    modifiers: definition.bonuses.map((bonus) => ({
      ...bonus,
      id: `${id}:${bonus.attribute}`,
      operation: "ADD",
    })),
  });
};
