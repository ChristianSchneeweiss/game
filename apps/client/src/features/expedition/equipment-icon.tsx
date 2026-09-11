import { Shield, Sparkles, Sword, Shirt } from "lucide-react";

export function EquipmentIcon({
  type,
  slot,
}: {
  type?: string;
  slot?: "WEAPON" | "ARMOR";
}) {
  const Icon =
    type === "iron-sword" || (!type && slot === "WEAPON")
      ? Sword
      : type === "oakwarden-staff"
        ? Sparkles
        : type === "iron-cuirass"
          ? Shield
          : Shirt;
  return (
    <span className="expedition-equipment-icon" aria-hidden="true">
      <Icon size={24} />
    </span>
  );
}
