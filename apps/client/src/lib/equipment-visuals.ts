import type { EquipmentType } from "@loot-game/game/items/equipment-types";
import {
  TIERED_EQUIPMENT,
  type TieredEquipmentType,
} from "@loot-game/game/items/equipment/tiered-equipment";

const tierColors = {
  E: "#927761",
  D: "#72927a",
  C: "#739eae",
  B: "#9b8db7",
  A: "#ccb47a",
  S: "#eed6a1",
};

export function accessoryVisualFor(type?: string) {
  if (!type || !Object.hasOwn(TIERED_EQUIPMENT, type)) return undefined;
  const item = TIERED_EQUIPMENT[type as TieredEquipmentType];
  if (item.equipmentSlot === "WEAPON" || item.equipmentSlot === "ARMOR")
    return undefined;
  return { slot: item.equipmentSlot, color: tierColors[item.tier] };
}

export const weaponVisuals = {
  "sunforged-greatsword": { kind: "sword", color: "#e9b86a", gem: "#e9b86a" },
  "starfall-staff": { kind: "staff", color: "#71659f", gem: "#c3c7ff" },
  "kingsfall-edge": { kind: "sword", color: "#e4ce83", gem: "#e4ce83" },
  "iron-sword": { kind: "sword", color: "#cbd4df", gem: "#cbd4df" },
  "oakwarden-staff": { kind: "staff", color: "#74502c", gem: "#8bdd9e" },
  "ashen-falchion": { kind: "sword", color: "#d77946", gem: "#d77946" },
  "tideglass-staff": { kind: "staff", color: "#4c8291", gem: "#7ce2e1" },
  "stormfang-blade": { kind: "sword", color: "#9caff3", gem: "#9caff3" },
  "hollow-scepter": { kind: "staff", color: "#453b59", gem: "#c89af5" },
} satisfies Partial<
  Record<
    EquipmentType,
    {
      kind: "sword" | "staff";
      color: string;
      gem: string;
    }
  >
>;

export const armorVisuals = {
  "runebound-vestments": { kind: "robes", color: "#567e84", skirt: "#3b555e" },
  "citadel-carapace": { kind: "plate", color: "#666c84", skirt: "#666c84" },
  "astral-regalia": { kind: "robes", color: "#9483be", skirt: "#61527e" },
  "dawnwarden-aegis": { kind: "plate", color: "#d5bd85", skirt: "#d5bd85" },
  "iron-cuirass": { kind: "plate", color: "#9ab1c7", skirt: "#9ab1c7" },
  "int-armor": { kind: "robes", color: "#7660a6", skirt: "#594376" },
  "emberguard-mail": { kind: "plate", color: "#865447", skirt: "#865447" },
  "tidewoven-robes": { kind: "robes", color: "#529eaa", skirt: "#326975" },
  "stormrunner-leathers": {
    kind: "leather",
    color: "#4d587b",
    skirt: "#4d587b",
  },
  "gravewarden-plate": { kind: "plate", color: "#696378", skirt: "#696378" },
} satisfies Partial<
  Record<
    EquipmentType,
    {
      kind: "plate" | "robes" | "leather";
      color: string;
      skirt: string;
    }
  >
>;

export function weaponVisualFor(type?: string) {
  return type && Object.hasOwn(weaponVisuals, type)
    ? weaponVisuals[type as keyof typeof weaponVisuals]
    : undefined;
}

export function armorVisualFor(type?: string) {
  return type && Object.hasOwn(armorVisuals, type)
    ? armorVisuals[type as keyof typeof armorVisuals]
    : undefined;
}
