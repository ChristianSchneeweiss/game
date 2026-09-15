import type { z } from "zod";
import { EquipmentTypeSchema, type EquipmentType } from "./equipment-types";
import {
  EQUIPMENT_DEFINITIONS,
  type EquipmentDefinition,
} from "./equipment/equipment-catalog";
import {
  CONSUMABLE_DEFINITIONS,
  MATERIAL_DEFINITIONS,
  ConsumableDefinitionSchema,
  MaterialDefinitionSchema,
  TierSchema,
} from "./stackable-catalog";

/** Validated catalog identity; an arbitrary string cannot enter equipment builds. */
export type StackableItemType = string & {
  readonly __stackableItemType: unique symbol;
};
export type ItemType = EquipmentType | StackableItemType;
export type ItemDefinition =
  | (EquipmentDefinition & { kind: "equipment"; type: EquipmentType })
  | (z.infer<typeof ConsumableDefinitionSchema> & {
      kind: "consumable";
      type: StackableItemType;
    })
  | (z.infer<typeof MaterialDefinitionSchema> & {
      kind: "material";
      type: StackableItemType;
    });
export type ItemKind = ItemDefinition["kind"];

/** Resolve canonical metadata without constructing a character or runtime item. */
export function getItemDefinition(type: string): ItemDefinition {
  const equipment = EquipmentTypeSchema.safeParse(type);
  const consumable = Object.hasOwn(CONSUMABLE_DEFINITIONS, type);
  const material = Object.hasOwn(MATERIAL_DEFINITIONS, type);
  if (Number(equipment.success) + Number(consumable) + Number(material) > 1)
    throw new Error(`Duplicate item definition: ${type}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(type))
    throw new Error(`Invalid item identifier: ${type}`);
  if (equipment.success) {
    const definition = EQUIPMENT_DEFINITIONS[equipment.data];
    TierSchema.parse(definition.tier);
    return { ...definition, kind: "equipment", type: equipment.data };
  }
  if (consumable)
    return {
      ...ConsumableDefinitionSchema.parse(CONSUMABLE_DEFINITIONS[type]),
      kind: "consumable",
      type: type as StackableItemType,
    };
  if (material)
    return {
      ...MaterialDefinitionSchema.parse(MATERIAL_DEFINITIONS[type]),
      kind: "material",
      type: type as StackableItemType,
    };
  throw new Error(`Unknown item type: ${type}`);
}

export function getItemDefinitions(): ItemDefinition[] {
  return [
    ...EquipmentTypeSchema.options,
    ...Object.keys(CONSUMABLE_DEFINITIONS),
    ...Object.keys(MATERIAL_DEFINITIONS),
  ].map(getItemDefinition);
}

export function consumableContextLabel(context: "battle" | "outside-battle") {
  return context === "battle"
    ? "Battle (requires equipping)"
    : "Outside battle (from inventory)";
}
