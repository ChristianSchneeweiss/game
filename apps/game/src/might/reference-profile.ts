import type { EntityAttributes } from "../entity-types";
import type { ItemType } from "../items/item-types";
import type { SpellType } from "../spells/base/spell-types";

/** Assessment inputs only. These do not grant stats or equipment to live characters. */
export const MIGHT_REFERENCE = {
  version: 3,
  level: 31,
  attributeBudget: 160,
  rounds: [6, 12],
  // Real E–B gear supplies all reference defenses and critical chance.
  armor: 0,
  magicResistance: 0,
  critChance: 0,
  accessories: [
    "duelist-signet",
    "thornwood-charm",
    "scouts-treads",
    "stormgrip-gloves",
    "sentinel-greathelm",
    "travelers-cloak",
    "rootbound-cinch",
  ] satisfies ItemType[],
  profiles: {
    physical: {
      attributes: { strength: 60, intelligence: 20, vitality: 55, agility: 25 },
      equipment: ["iron-sword", "iron-cuirass"],
      spells: [
        "stunning-strike",
        "tidepiercer-thrust",
        "vital-strike",
        "rupture",
      ],
    },
    caster: {
      attributes: { strength: 20, intelligence: 60, vitality: 55, agility: 25 },
      equipment: ["oakwarden-staff", "int-armor"],
      spells: ["soulflare", "charred-chains", "lightning-surge", "cinderbrand"],
    },
    tank: {
      attributes: {
        strength: 35,
        intelligence: 20,
        vitality: 80,
        agility: 25,
      },
      equipment: ["iron-sword", "iron-cuirass"],
      spells: [
        "stunning-strike",
        "festering-blow",
        "vital-strike",
        "stone-bark",
      ],
    },
    agility: {
      attributes: { strength: 25, intelligence: 20, vitality: 55, agility: 60 },
      equipment: ["stormfang-blade", "iron-cuirass"],
      spells: ["stunning-strike", "precise-thrust", "vital-strike", "rupture"],
    },
  } satisfies Record<
    string,
    {
      attributes: EntityAttributes;
      equipment: ItemType[];
      spells: SpellType[];
    }
  >,
} as const;

export type MightReferenceBuild = keyof typeof MIGHT_REFERENCE.profiles;
