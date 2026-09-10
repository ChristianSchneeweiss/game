import type { VisualCue } from "./timeline";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";

export type ElementalEffect =
  | "fire"
  | "brand"
  | "chains"
  | "soul"
  | "drain"
  | "lightning"
  | "storm"
  | "water"
  | "torrent"
  | "tide-spear"
  | "restore";
const elementalEffects: Partial<
  Record<NonNullable<VisualCue["skillType"]>, ElementalEffect>
> = {
  fireball: "fire",
  "cinder-wisp": "fire",
  cinderbrand: "brand",
  "charred-chains": "chains",
  soulflare: "soul",
  "vital-strike": "drain",
  "lightning-surge": "lightning",
  "volt-lash": "lightning",
  "storm-pulse": "storm",
  "aqua-wave": "water",
  "tidal-pulse": "water",
  "torrent-spiral": "torrent",
  "tidepiercer-thrust": "tide-spear",
  "ocean-blessing": "restore",
  "stream-of-life": "restore",
};

export function elementalEffectFor(
  cue: VisualCue,
  targetId?: string,
  event?: TimelineEventFull["event"],
) {
  if (cue.kind !== "SPELL_CAST" || !cue.skillType) return undefined;
  const effect = elementalEffects[cue.skillType];
  // Lifesteal events include the recipient of the heal. Their restoration must
  // never be painted as another damaging hit on the caster.
  if (
    effect &&
    targetId &&
    event?.eventType === "SPELL_CAST" &&
    event.data.healingApplied?.has(targetId) &&
    !event.data.damageApplied?.has(targetId)
  )
    return "restore";
  return effect;
}

export function hasSpellFeedback(cue: VisualCue) {
  return !!(natureEffectFor(cue) || elementalEffectFor(cue));
}

export type NatureEffect =
  | "roots"
  | "bark"
  | "splinters"
  | "leaves"
  | "verdant"
  | "stone"
  | "venom";
const natureEffects: Partial<
  Record<NonNullable<VisualCue["skillType"]>, NatureEffect>
> = {
  rootgrasp: "roots",
  "stone-bark": "bark",
  "splinter-shot": "splinters",
  "natures-embrace": "leaves",
  "single-heal": "leaves",
  "verdant-smite": "verdant",
  "crushing-blow": "stone",
  earthshatter: "stone",
  "festering-blow": "venom",
};

export function natureEffectFor(cue: VisualCue) {
  return cue.kind === "SPELL_CAST" && cue.skillType
    ? natureEffects[cue.skillType]
    : undefined;
}

export function cueColor(style: VisualCue["style"] | undefined) {
  return style === "heal"
    ? "#9ef0b7"
    : style === "ward"
      ? "#eacb82"
      : style === "spell"
        ? "#9bd9ef"
        : "#ffbd90";
}
