import { Shield, Sparkles, Sword, Shirt } from "lucide-react";
import { armorVisualFor, weaponVisualFor } from "@/lib/equipment-visuals";
import type { EquipmentSlot } from "@loot-game/game/items/equipment/equipment";
import { equipmentSlotIcons } from "@/lib/equipment-details";

export function EquipmentIcon({
  type,
  slot,
}: {
  type?: string;
  slot?: EquipmentSlot;
}) {
  const weapon = weaponVisualFor(type);
  const armor = armorVisualFor(type);
  const Icon =
    weapon?.kind === "staff"
      ? Sparkles
      : weapon?.kind === "sword" || (!type && slot === "WEAPON")
        ? Sword
        : armor?.kind === "plate"
          ? Shield
          : slot && slot !== "ARMOR"
            ? equipmentSlotIcons[slot]
            : Shirt;
  return (
    <span className="expedition-equipment-icon" aria-hidden="true">
      <Icon size={24} />
    </span>
  );
}
