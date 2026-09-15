import type { EquipmentSlot } from "./equipment";

export const EQUIPMENT_SLOTS = [
  "WEAPON",
  "ARMOR",
  "HELMET",
  "GLOVES",
  "BOOTS",
  "CLOAK",
  "BELT",
  "RING",
  "AMULET",
] as const satisfies readonly EquipmentSlot[];

export const equipmentSlotLabels = {
  WEAPON: "Weapons",
  ARMOR: "Armor",
  HELMET: "Helmets",
  GLOVES: "Gloves",
  BOOTS: "Boots",
  CLOAK: "Cloaks",
  BELT: "Belts",
  RING: "Rings",
  AMULET: "Amulets",
} satisfies Record<EquipmentSlot, string>;
