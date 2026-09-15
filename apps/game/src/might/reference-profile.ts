import type { EntityAttributes } from "../entity-types";
import type { ItemType } from "../items/item-types";
import type { SpellType } from "../spells/base/spell-types";

/** Assessment inputs only. These do not grant stats or equipment to live characters. */
export const MIGHT_REFERENCE = {
  version: 2,
  attributeBudget: 200,
  rounds: [6, 12],
  // Explicit endgame gear allowance, in addition to the equipped catalogue items.
  armor: 18,
  magicResistance: 12,
  critChance: 0.1,
  profiles: {
    physical: {
      attributes: { strength: 80, intelligence: 20, vitality: 70, agility: 30 },
      equipment: ["iron-sword", "iron-cuirass"],
      spells: [
        "bladestorm-rhythm",
        "tidepiercer-thrust",
        "vital-strike",
        "rupture",
      ],
    },
    caster: {
      attributes: { strength: 20, intelligence: 80, vitality: 70, agility: 30 },
      equipment: ["oakwarden-staff", "int-armor"],
      spells: ["soulflare", "charred-chains", "lightning-surge", "cinderbrand"],
    },
    tank: {
      attributes: {
        strength: 50,
        intelligence: 20,
        vitality: 100,
        agility: 30,
      },
      equipment: ["iron-sword", "iron-cuirass"],
      spells: ["bulwark-bash", "festering-blow", "vital-strike", "iron-will"],
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
