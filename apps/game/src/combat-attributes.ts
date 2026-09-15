import type {
  Affinities,
  Entity,
  EntityAttributes,
  SpecialAttributes,
} from "./entity-types";

/** Effective values after equipment, passives, and active attribute modifiers. */
export function readCombatAttributes(entity: Entity) {
  return {
    baseAttributes: {
      strength: entity.getAttribute("strength"),
      intelligence: entity.getAttribute("intelligence"),
      vitality: entity.getAttribute("vitality"),
      agility: entity.getAttribute("agility"),
      movement: entity.getAttribute("movement"),
    } satisfies EntityAttributes,
    specialAttributes: {
      lifesteal: entity.getAttribute("lifesteal"),
      omnivamp: entity.getAttribute("omnivamp"),
      armor: entity.getAttribute("armor"),
      magicResistance: entity.getAttribute("magicResistance"),
      armorPenetration: entity.getAttribute("armorPenetration"),
      magicPenetration: entity.getAttribute("magicPenetration"),
      healthRegen: entity.getAttribute("healthRegen"),
      manaRegen: entity.getAttribute("manaRegen"),
      blessed: entity.getAttribute("blessed"),
      critChance: entity.getAttribute("critChance"),
      critDamage: entity.getAttribute("critDamage"),
    } satisfies SpecialAttributes,
    affinities: {
      fire: entity.getAttribute("fire"),
      lightning: entity.getAttribute("lightning"),
      earth: entity.getAttribute("earth"),
      water: entity.getAttribute("water"),
      dark: entity.getAttribute("dark"),
    } satisfies Affinities,
  };
}
