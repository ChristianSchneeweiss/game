import type { AllAttributeKeys } from "@loot-game/game/entity-types";
export {
  formatAttribute,
  formatEquipmentModifier,
} from "@loot-game/game/items/equipment/format-modifier";
import type { EquipmentSlot } from "@loot-game/game/items/equipment/equipment";
import {
  Circle,
  Crown,
  Footprints,
  Gem,
  Hand,
  RectangleHorizontal,
  Shield,
  Shirt,
  Sword,
} from "lucide-react";

export const equipmentSlotIcons = {
  WEAPON: Sword,
  ARMOR: Shield,
  RING: Circle,
  AMULET: Gem,
  BOOTS: Footprints,
  GLOVES: Hand,
  HELMET: Crown,
  CLOAK: Shirt,
  BELT: RectangleHorizontal,
} satisfies Record<EquipmentSlot, typeof Sword>;

const labels: Partial<Record<AllAttributeKeys, string>> = {
  magicResistance: "Magic resistance",
  armorPenetration: "Armor penetration",
  magicPenetration: "Magic penetration",
  healthRegen: "Health / activation",
  manaRegen: "Mana / activation",
  critChance: "Critical chance",
  critDamage: "Critical bonus",
};

export function attributeLabel(attribute: AllAttributeKeys) {
  return (
    labels[attribute] ?? attribute.charAt(0).toUpperCase() + attribute.slice(1)
  );
}
