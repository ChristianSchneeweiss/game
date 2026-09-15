import type { SpellType } from "../spells/base/spell-types";
import type { EquipmentType } from "../items/equipment-types";
import type { Footprint, Targeting, WeaponAttackProfile } from "./types";

export const FOOTPRINTS = {
  single: [[0, 0]],
  plus: [
    [0, 0],
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ],
  frontThree: [
    [-1, -1],
    [0, -1],
    [1, -1],
  ],
  lineTwo: [
    [0, -1],
    [0, -2],
  ],
  lineThree: [
    [0, -1],
    [0, -2],
    [0, -3],
  ],
  ringOne: [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ],
} as const satisfies Record<string, Footprint>;

const tile = (
  max: number,
  recipients: Targeting["recipients"] = "enemies",
  affectedTiles: Footprint = FOOTPRINTS.single,
): Targeting => ({
  aim: "tile",
  range: { min: recipients === "allies" ? 0 : 1, max },
  affectedTiles,
  recipients,
});
const direction = (affectedTiles: Footprint): Targeting => ({
  aim: "direction",
  affectedTiles,
  recipients: "enemies",
});
const global = (
  recipients: Targeting["recipients"] = "enemies",
): Targeting => ({ aim: "global", recipients });
const self: Targeting = {
  aim: "caster",
  affectedTiles: FOOTPRINTS.single,
  recipients: "allies",
};

/** Rules-v2 authoring defaults. Active battles capture copies; legacy rules never consult this table. */
export const SPELL_TARGETING = {
  "basic-attack": tile(1),
  fireball: tile(3),
  "single-heal": tile(3, "allies"),
  "crude-strike": tile(1),
  "festering-blow": direction(FOOTPRINTS.frontThree),
  "cinder-wisp": tile(3),
  "vital-strike": tile(1),
  "splinter-shot": tile(4),
  cinderbrand: tile(3),
  "precise-thrust": direction(FOOTPRINTS.lineTwo),
  soulflare: tile(3),
  "charred-chains": tile(3, "enemies", FOOTPRINTS.plus),
  "crushing-blow": tile(1),
  "stone-bark": self,
  rootgrasp: tile(3, "enemies", FOOTPRINTS.plus),
  "verdant-smite": tile(3),
  "natures-embrace": global("allies"),
  "lightning-surge": global(),
  "stunning-strike": tile(1),
  "staggering-jab": tile(1),
  "battle-roar": tile(2),
  "torrent-spiral": {
    aim: "caster",
    affectedTiles: FOOTPRINTS.ringOne,
    recipients: "enemies",
  },
  "tidepiercer-thrust": direction(FOOTPRINTS.lineThree),
  "ocean-blessing": tile(3, "allies"),
  "aqua-wave": direction(FOOTPRINTS.frontThree),
  "tidal-pulse": tile(3, "enemies", FOOTPRINTS.plus),
  "stream-of-life": self,
  rupture: tile(1),
  "storm-pulse": global(),
  "volt-lash": global(),
  "final-verdict": tile(1),
  "aegis-wall": global("allies"),
  "bulwark-bash": tile(1),
  earthshatter: global(),
  "deflecting-stance": tile(2, "allies"),
  "bladestorm-rhythm": tile(1),
  "iron-will": tile(3, "allies"),
  "arcane-channeling": global(),
  "fleetfoot-gambit": tile(3, "allies"),
} satisfies Record<SpellType, Targeting>;

export const WEAPON_PROFILES = {
  "sunforged-greatsword": {
    targeting: tile(1),
    damageType: "PHYSICAL",
    baseDamage: { min: 8, max: 22 },
    scaling: [{ attribute: "strength", multiplier: 0.3 }],
  },
  "starfall-staff": {
    targeting: tile(4),
    damageType: "MAGICAL",
    baseDamage: { min: 10, max: 24 },
    scaling: [{ attribute: "intelligence", multiplier: 0.35 }],
  },
  "kingsfall-edge": {
    targeting: tile(1),
    damageType: "PHYSICAL",
    baseDamage: { min: 12, max: 28 },
    scaling: [
      { attribute: "strength", multiplier: 0.4 },
      { attribute: "agility", multiplier: 0.15 },
    ],
  },
  "iron-sword": {
    targeting: tile(1),
    damageType: "PHYSICAL",
    baseDamage: { min: 0, max: 15 },
    scaling: [{ attribute: "strength", multiplier: 0.25 }],
  },
  "oakwarden-staff": {
    targeting: tile(3),
    damageType: "MAGICAL",
    baseDamage: { min: 0, max: 15 },
    scaling: [{ attribute: "intelligence", multiplier: 0.25 }],
  },
  "ashen-falchion": {
    targeting: tile(1),
    damageType: "PHYSICAL",
    baseDamage: { min: 3, max: 18 },
    scaling: [{ attribute: "strength", multiplier: 0.25 }],
  },
  "tideglass-staff": {
    targeting: tile(3),
    damageType: "MAGICAL",
    baseDamage: { min: 0, max: 12 },
    scaling: [{ attribute: "intelligence", multiplier: 0.25 }],
  },
  "stormfang-blade": {
    targeting: tile(1),
    damageType: "PHYSICAL",
    baseDamage: { min: 0, max: 12 },
    scaling: [
      { attribute: "agility", multiplier: 0.3 },
      { attribute: "strength", multiplier: 0.1 },
    ],
  },
  "hollow-scepter": {
    targeting: tile(3),
    damageType: "MAGICAL",
    baseDamage: { min: 2, max: 14 },
    scaling: [{ attribute: "intelligence", multiplier: 0.25 }],
  },
  unarmed: {
    targeting: tile(1),
    damageType: "PHYSICAL",
    baseDamage: { min: 0, max: 8 },
    scaling: [{ attribute: "strength", multiplier: 0.1 }],
  },
  "enemy-default": {
    targeting: tile(1),
    damageType: "PHYSICAL",
    baseDamage: { min: 0, max: 15 },
    scaling: [],
  },
} satisfies Partial<Record<EquipmentType, WeaponAttackProfile>> &
  Record<"unarmed" | "enemy-default", WeaponAttackProfile>;

export function weaponProfileFor(
  itemType?: EquipmentType,
): WeaponAttackProfile | undefined {
  return itemType && Object.hasOwn(WEAPON_PROFILES, itemType)
    ? WEAPON_PROFILES[itemType as keyof typeof WEAPON_PROFILES]
    : undefined;
}
