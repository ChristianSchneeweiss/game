import { FlaskConical, Gem } from "lucide-react";
import { getItemDefinition } from "@loot-game/game/items/catalog";
import { EquipmentIcon } from "@/features/expedition/equipment-icon";

export function ItemIcon({ type }: { type: string }) {
  const item = getItemDefinition(type);
  if (item.kind === "equipment")
    return <EquipmentIcon type={item.type} slot={item.equipmentSlot} />;
  const Icon = item.kind === "consumable" ? FlaskConical : Gem;
  return (
    <span className="expedition-equipment-icon" aria-hidden="true">
      <Icon size={24} />
    </span>
  );
}
