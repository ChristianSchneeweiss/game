import type { AttributeModifier } from "../../types";
import type { EquipmentType } from "../equipment-types";
import type { EquipmentParams } from "./equipment";
import { TIERED_EQUIPMENT } from "./tiered-equipment";

export type EquipmentDefinition = Pick<
  EquipmentParams,
  "name" | "description" | "equipmentSlot" | "tier"
> & {
  bonuses: Pick<AttributeModifier, "attribute" | "value">[];
};

export const EQUIPMENT_DEFINITIONS = {
  ...TIERED_EQUIPMENT,
  "int-armor": {
    name: "Int Armor",
    description: "Increases intelligence by 10.",
    equipmentSlot: "ARMOR",
    tier: "E",
    bonuses: [{ attribute: "intelligence", value: 10 }],
  },
  "iron-sword": {
    name: "Iron Sword",
    description: "A dependable steel blade. Increases strength by 6.",
    equipmentSlot: "WEAPON",
    tier: "E",
    bonuses: [{ attribute: "strength", value: 6 }],
  },
  "iron-cuirass": {
    name: "Iron Cuirass",
    description: "Riveted plate and a matching shield. Increases armor by 12.",
    equipmentSlot: "ARMOR",
    tier: "D",
    bonuses: [{ attribute: "armor", value: 12 }],
  },
  "oakwarden-staff": {
    name: "Oakwarden Staff",
    description:
      "Living wood cradles an emerald seed. Increases intelligence by 8.",
    equipmentSlot: "WEAPON",
    tier: "D",
    bonuses: [{ attribute: "intelligence", value: 8 }],
  },
  "ashen-falchion": {
    name: "Ashen Falchion",
    description:
      "An ember-edged blade for breaking armored foes. +10 strength and +4 armor penetration.",
    equipmentSlot: "WEAPON",
    tier: "D",
    bonuses: [
      { attribute: "strength", value: 10 },
      { attribute: "armorPenetration", value: 4 },
    ],
  },
  "tideglass-staff": {
    name: "Tideglass Staff",
    description:
      "Sea glass gathers a steady current of mana. +10 intelligence and +3 mana regeneration per activation.",
    equipmentSlot: "WEAPON",
    tier: "D",
    bonuses: [
      { attribute: "intelligence", value: 10 },
      { attribute: "manaRegen", value: 3 },
    ],
  },
  "stormfang-blade": {
    name: "Stormfang Blade",
    description:
      "A lightning-tempered blade that rewards agility. +8 agility and +8 percentage points of critical chance. Basic Attack scales with agility and strength.",
    equipmentSlot: "WEAPON",
    tier: "C",
    bonuses: [
      { attribute: "agility", value: 8 },
      { attribute: "critChance", value: 0.08 },
    ],
  },
  "hollow-scepter": {
    name: "Hollow Scepter",
    description:
      "A violet crystal cuts through magical wards. +10 intelligence and +5 magic penetration.",
    equipmentSlot: "WEAPON",
    tier: "C",
    bonuses: [
      { attribute: "intelligence", value: 10 },
      { attribute: "magicPenetration", value: 5 },
    ],
  },
  "emberguard-mail": {
    name: "Emberguard Mail",
    description:
      "Blackened mail guards against blade and sorcery. +10 armor and +6 magic resistance.",
    equipmentSlot: "ARMOR",
    tier: "E",
    bonuses: [
      { attribute: "armor", value: 10 },
      { attribute: "magicResistance", value: 6 },
    ],
  },
  "tidewoven-robes": {
    name: "Tidewoven Robes",
    description:
      "Ceremonial robes steady a healer's hand. +6 intelligence and +5 blessed, improving damage and healing rolls.",
    equipmentSlot: "ARMOR",
    tier: "E",
    bonuses: [
      { attribute: "intelligence", value: 6 },
      { attribute: "blessed", value: 5 },
    ],
  },
  "stormrunner-leathers": {
    name: "Stormrunner Leathers",
    description:
      "Supple wyvern hide for swift repositioning. +8 agility and +1 movement tile per activation.",
    equipmentSlot: "ARMOR",
    tier: "D",
    bonuses: [
      { attribute: "agility", value: 8 },
      { attribute: "movement", value: 1 },
    ],
  },
  "gravewarden-plate": {
    name: "Gravewarden Plate",
    description:
      "Burial plate trades speed for protection. +18 armor and +8 magic resistance, but -1 movement tile per activation.",
    equipmentSlot: "ARMOR",
    tier: "D",
    bonuses: [
      { attribute: "armor", value: 18 },
      { attribute: "magicResistance", value: 8 },
      { attribute: "movement", value: -1 },
    ],
  },
} satisfies Record<EquipmentType, EquipmentDefinition>;
