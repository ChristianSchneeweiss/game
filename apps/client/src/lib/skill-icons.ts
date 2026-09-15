import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import type { PassiveType } from "@loot-game/game/passive-skills/base/passive-types";
import type { EffectType } from "@loot-game/game/types";

export const skillNames = {
  "basic-attack": "Basic Attack",
  fireball: "Fireball",
  "single-heal": "Single Heal",
  "crude-strike": "Crude Strike",
  "festering-blow": "Festering Blow",
  "cinder-wisp": "Cinder Wisp",
  "vital-strike": "Vital Strike",
  "splinter-shot": "Splinter Shot",
  cinderbrand: "Cinderbrand",
  "precise-thrust": "Precise Thrust",
  soulflare: "Soulflare",
  "charred-chains": "Charred Chains",
  "crushing-blow": "Crushing Blow",
  "stone-bark": "Stone Bark",
  rootgrasp: "Rootgrasp",
  "verdant-smite": "Verdant Smite",
  "natures-embrace": "Nature’s Embrace",
  "lightning-surge": "Lightning Surge",
  "stunning-strike": "Stunning Strike",
  "staggering-jab": "Staggering Jab",
  "battle-roar": "Battle Roar",
  "torrent-spiral": "Torrent Spiral",
  "tidepiercer-thrust": "Tidepiercer Thrust",
  "ocean-blessing": "Ocean Blessing",
  "aqua-wave": "Aqua Wave",
  "tidal-pulse": "Tidal Pulse",
  "stream-of-life": "Stream of Life",
  rupture: "Rupture",
  "storm-pulse": "Storm Pulse",
  "volt-lash": "Volt Lash",
  "final-verdict": "Final Verdict",
  "aegis-wall": "Aegis Wall",
  "bulwark-bash": "Bulwark Bash",
  earthshatter: "Earthshatter",
  "deflecting-stance": "Deflecting Stance",
  "bladestorm-rhythm": "Bladestorm Rhythm",
  "iron-will": "Iron Will",
  "arcane-channeling": "Arcane Channeling",
  "fleetfoot-gambit": "Fleetfoot Gambit",
  "armor-up": "Armor Up",
  "thorn-carapace": "Thorn Carapace",
  "blessed-fortune": "Blessed Fortune",
  bloodfang: "Bloodfang",
  soulleech: "Soulleech",
  "mystic-flow": "Mystic Flow",
  "vital-wellspring": "Vital Wellspring",
  "stoneform-resolve": "Stoneform Resolve",
  "titans-resurgence": "Titan’s Resurgence",
  "keen-instincts": "Keen Instincts",
  "predators-focus": "Predator’s Focus",
  "fleet-footed": "Fleet Footed",
  "arcane-barrier": "Arcane Barrier",
  "last-bastion": "Last Bastion",
  "merciful-light": "Merciful Light",
  executioner: "Executioner",
} satisfies Record<SpellType | PassiveType, string>;

export const conditionIconNames = {
  "effect-buff": "Buff",
  "effect-debuff": "Debuff",
  "effect-dot": "Damage over time",
  "effect-hot": "Healing over time",
  "effect-curse": "Curse",
  "effect-stun": "Stun",
  "effect-charge": "Charging",
  "effect-control": "Controlled",
  "effect-shield": "Shielded",
  "effect-passive": "Passive effect",
} satisfies Record<`effect-${Lowercase<EffectType>}`, string>;

const iconNames: Record<string, string> = {
  ...skillNames,
  ...conditionIconNames,
};
export type SkillIconType =
  | keyof typeof skillNames
  | keyof typeof conditionIconNames;
export function skillName(type: string) {
  return iconNames[type] ?? "Unknown skill";
}

export function skillIconUrl(type?: string) {
  const key = type && Object.hasOwn(iconNames, type) ? type : "effect-passive";
  return `/icons/skills/v1/${key}.webp`;
}
