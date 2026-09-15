import type { SpellType } from "../spells/base/spell-types";
import type { MightAssessment } from "./might";
import { estimateMight } from "./references";

export const spellAssessments = {
  "bladestorm-rhythm": estimateMight(
    "spells",
    600,
    "Increase 320 → 600: the previous rating used AGI30 instead of a compatible agility build. The level-31, 160-point AGI60 build reaches AGI88 with real E–B equipment and 20% crit, producing 205.44/145.44 preview damage across two immediate strikes. Actual sequence pairs confirm strong added output. Price below the 877-point direct-damage comparison after melee, overkill, 15 mana and cooldown 4. Two immediate strikes consume one activation and have no charging discount. This is a build-selection correction, not a general catalogue rescale.",
  ),
  "volt-lash": estimateMight(
    "spells",
    1150,
    "Reduce 1250 → 1150: four INT82 hits total about 265.22/185.22 versus the former 302.7/222.7. Every hit can stun and can choose a fresh living target; discount overlapping denial and overkill. Real sequences verify all four hits and control; 35 mana and cooldown 4. The modest 8% correction preserves its leading burst rating.",
  ),
  "arcane-channeling": estimateMight(
    "spells",
    720,
    "Reduce 780 → 720: INT82 releases 155.8 raw damage per surviving original target, preview 174.50/154.50 after crit/defense. Two useful targets average 329 damage across the cast plus one blocked activation, about 164.5 per committed action. Immediate-payoff pairs verify the lost action; target-loss and caster-death cases reduce or cancel the release. Apply the remaining modest discount for delay, risk, 40 mana and cooldown 6 once. Charging is a restriction, never a unique-effect premium.",
  ),
  "final-verdict": estimateMight(
    "spells",
    380,
    "Reduce 410 → 380: STR66 gives about 82.66/52.66 ordinary damage versus 98.8/68.8. The ≤10%-HP branch substitutes maximum health before defense, so retain a conditional finisher premium only for useful extra remaining HP. Melee, 10 mana, cooldown 2; do not value uncapped overkill.",
  ),
  "precise-thrust": estimateMight(
    "spells",
    85,
    "Increase 55 → 85: review on the compatible, equal-budget AGI88 build instead of AGI30. Preview rises from about 14.9/0 to 30.12/4.04 per covered enemy. Two-tile alignment, flat armor, 5 mana and cooldown 1 keep the correction well below a direct proportional rescale.",
  ),
  "tidepiercer-thrust": estimateMight(
    "spells",
    430,
    "Reduce 460 → 430: STR66 gives 69.55/41.80 per line target versus about 81.5/53.8 previously. Keep the distinct three-tile reach and 30% chance to ignore 25% defense; favorable line trials support retaining most of the rating. About 1.5 useful targets, 25 mana, cooldown 3.",
  ),
  "aegis-wall": estimateMight(
    "spells",
    600,
    "Retain 600: VIT86 grants each recipient a shield of 41.5% of that recipient’s maximum HP (228.25–332 here), expiring after two recipient end steps. Pressure sequences confirm protection. Value only absorption before expiry, for 35 mana and cooldown 6. The advertised +20 Armor/MR remains unimplemented and earns nothing.",
  ),
  "aqua-wave": estimateMight(
    "spells",
    50,
    "Retain 50: unscaled 10–14 magical damage per front-arc target, about 13.44/0.48 with current crit. Its 20% AGI−2 proc is initiative only. About 1.5 useful targets, 10 mana, cooldown 1; no control premium for movement or lost actions.",
  ),
  "basic-attack": estimateMight(
    "spells",
    120,
    "Retain the equipped, free, repeatable action rating. The sword now previews 26.88/2.82 damage and the caster staff 31.36/11.36 against the two defense cases. Staff reach remains useful; an unarmed preview is a different context.",
  ),
  "battle-roar": estimateMight(
    "spells",
    100,
    "Retain 100: a 60% chance to deny one enemy activation at range 2, with no damage. Effect-disabled sequences expose the denial; 15 mana, cooldown 3 and the caster action traded away prevent a larger premium.",
  ),
  "bulwark-bash": estimateMight(
    "spells",
    500,
    "Retain 500: VIT86 previews 71.79/41.79 physical damage plus a guaranteed one-turn stun, free with cooldown 2. Effect-disabled pairs remove exactly one enemy action when the target survives. Reliable denial supports its premium over stronger plain strikes.",
  ),
  "charred-chains": estimateMight(
    "spells",
    370,
    "Retain 370: INT82 previews 56.34/36.34 per cross target. A 25% chance of 10% vulnerability improves timely follow-ups; it is not a 25% magnitude debuff. About 1.5 useful targets, 25 mana, cooldown 3 and formation constraints remain appropriate.",
  ),
  "cinder-wisp": estimateMight(
    "spells",
    105,
    "Retain 105: INT82 previews 28.45/8.45 magical damage at range 3, 10 mana and cooldown 1. Close to the fixed useful-damage reference across defense cases; no extra effect to price.",
  ),
  cinderbrand: estimateMight(
    "spells",
    165,
    "Retain 165: INT82 previews 39.87/19.87 damage, with a 30% chance of two 5-damage burn ticks. The effect-disabled comparison confirms small conditional added damage. Costs 15 mana and cooldown 2; defenses and target death can erase the burn.",
  ),
  "crude-strike": estimateMight(
    "spells",
    25,
    "Retain 25: unscaled 6–10 melee damage, zero mana and cooldown. A 10% chance to reduce AGI by one changes initiative only; the effect has no measured benefit in this initiative-separated sequence and earns no denial premium.",
  ),
  "crushing-blow": estimateMight(
    "spells",
    135,
    "Retain 135: STR66 previews 25.98/1.97 damage. The 30% stun proc is the distinguishing benefit, confirmed by fewer enemy actions in effect-disabled pairs. Zero mana, cooldown 2, melee access; count denied actions once.",
  ),
  "deflecting-stance": estimateMight(
    "spells",
    160,
    "Retain 160: VIT86 reflects 71.5% through attacker defenses and subtracts actual reflected damage from the incoming hit. Ally-targeted pressure confirms conditional benefit; self-cast expires at its own end step. 25 mana, cooldown 4; no independent 50% reduction or promised non-stacking rule is credited.",
  ),
  earthshatter: estimateMight(
    "spells",
    1100,
    "Retain 1100: VIT86 previews 79.63/49.63 per global enemy, free with cooldown 4. A single 50% cast roll attempts stuns; two applied stuns unlock persistent +20 Armor/MR. The paired sequence verifies conditional protection. Long-fight protection and denial matter more than the small reference-stat reduction; no defense premium against one enemy.",
  ),
  "festering-blow": estimateMight(
    "spells",
    230,
    "Retain 230: VIT86 previews 38.98/8.98 damage per front-arc target, free with cooldown 2. Its 25% proc increases damage taken by 10%, not 25%; timely follow-ups add a small measured benefit. Use about 1.5 useful targets and avoid valuing every occupied tile.",
  ),
  fireball: estimateMight(
    "spells",
    65,
    "Retain 65: INT82 gives about 20.38/5.79 preview damage, range 3, 10 mana and cooldown 2. The sequence loses damage against a staff attack; it earns no unique-effect premium.",
  ),
  "fleetfoot-gambit": estimateMight(
    "spells",
    260,
    "Retain 260: spends a casting action, 50 mana and cooldown 8 to grant a partner one extra activation next round. The corrected partner sequence verifies the extra action and upkeep; extra recovery is 23 HP for this wounded physical build, not the old 35–50 assumption. Stronger available partner skills can exploit the timing; self-cast does not create a net free attack.",
  ),
  "iron-will": estimateMight(
    "spells",
    350,
    "Retain 350: +20 Armor/MR for two recipient end steps, cleanse of DEBUFF only, and 10%-max-HP healing strictly below 30% at resolution. These builds remain below VIT120. Ally-pressure sequences verify prevention; 20 mana, cooldown 6, timing and conditional rescue constrain value.",
  ),
  "lightning-surge": estimateMight(
    "spells",
    720,
    "Retain 720: INT82 previews 75.82/55.82 per enemy globally, with a 25% stun chance. The control comparison confirms denial. Two useful enemies, 50 mana and cooldown 3; flexible global delivery and control support retaining the existing estimate.",
  ),
  "natures-embrace": estimateMight(
    "spells",
    500,
    "Retain 500: INT82 gives 69.2 mean healing per wounded ally before rounding, globally, for 35 mana and cooldown 4. The two-hero sequence confirms useful party recovery; price about 1.5 wounded recipients and discount healthy allies and automatic recovery.",
  ),
  "ocean-blessing": estimateMight(
    "spells",
    150,
    "Retain 150: actual INT82 healing range is 31.4–36.4, mean 33.9 before rounding. The description incorrectly calculates its upper endpoint with roll 5; assessment uses the implementation. Range 3, 20 mana, cooldown 3, missing-health limits.",
  ),
  rootgrasp: estimateMight(
    "spells",
    410,
    "Retain 410: INT82 previews 49.06/29.06 per cross target and a 40% stun chance. Effect-disabled sequences confirm useful denial beyond damage. About 1.5 useful targets, 15 mana and cooldown 4; prevention is not added again to a full denial credit.",
  ),
  rupture: estimateMight(
    "spells",
    35,
    "Retain 35: unscaled 8–12 melee damage and a 20% chance of two 4-damage bleed ticks, zero mana, cooldown 1. Effect-disabled pairs confirm a small unarmored contribution; armor, overkill and target death suppress delayed ticks.",
  ),
  "single-heal": estimateMight(
    "spells",
    55,
    "Retain 55: INT82 heals 9.1–14.1 before rounding for 10 mana, cooldown 2, range 3. Immediate rescue has some flexibility, but this is small beside 550–800 HP and ordinary upkeep. Count only useful healing.",
  ),
  soulflare: estimateMight(
    "spells",
    520,
    "Retain 520: INT82 previews 85.90/65.90 ranged damage, with half actual damage returned as healing. The injured sequence activates that recovery. Its combined burst and rescue remain distinctive despite 40 mana, cooldown 4, overhealing and overkill.",
  ),
  "splinter-shot": estimateMight(
    "spells",
    35,
    "Retain 35: unscaled 6–10 physical damage, range 4, free, cooldown 1. A 20% chance of 10% armor reduction has a brief follow-up window; armored direct hits are blocked. Current scripted timing does not establish a larger debuff premium.",
  ),
  "staggering-jab": estimateMight(
    "spells",
    50,
    "Retain 50: only 4–6 unscaled melee damage, but a 20% stun chance, free with cooldown 1. Armor may erase the hit while a surviving enemy still loses an action. The proc is not guaranteed and its described paralysis is implemented as stun.",
  ),
  "stone-bark": estimateMight(
    "spells",
    40,
    "Retain 40: 28 armor becomes 35 for two target end steps. Self-cast consumes the first duration tick. The sequence shows some physical prevention but gives up an attack and 10 mana, cooldown 3; zero armor and magical-only pressure receive no benefit.",
  ),
  "storm-pulse": estimateMight(
    "spells",
    350,
    "Retain 350: INT82 previews 48.50/18.50 physical damage per candidate while selecting up to three distinct global targets. Its bonus proc is already included. Two useful targets, 25 mana, cooldown 3; armor, not MR, defends this INT-scaling spell.",
  ),
  "stream-of-life": estimateMight(
    "spells",
    225,
    "Retain 225: INT82 heals 44.8–50.8, mean 47.8 before rounding, to self. Injured sequences activate recovery; 25 mana, cooldown 4 and the attack forgone constrain this less flexible rescue option.",
  ),
  "stunning-strike": estimateMight(
    "spells",
    245,
    "Retain 245: STR66 previews 46.37/16.37 physical damage, with a 30% stun chance. Free, cooldown 2 and melee access. The effect-disabled sequence supports a real action-denial premium beyond its damage.",
  ),
  "tidal-pulse": estimateMight(
    "spells",
    310,
    "Retain 310: INT82 previews 51.30/31.30 per cross target, about 1.5 useful targets, 30 mana and cooldown 3. The 25% AGI−2 proc has no measured action denial in separated initiative cases; retain only a small timing-dependent initiative contribution.",
  ),
  "torrent-spiral": estimateMight(
    "spells",
    315,
    "Retain 315: STR66 previews 51.52/21.52 physical damage per adjacent enemy and a 25% chance of 25% vulnerability. About 1.5 useful targets in the surrounding ring; 35 mana, cooldown 4 and close positioning constrain the useful combination.",
  ),
  "verdant-smite": estimateMight(
    "spells",
    360,
    "Retain 360: INT82 previews 79.74/59.74 magical damage, plus a 50% chance of 15% armor reduction. The debuff helps subsequent physical hits, not this spell or MR. Range 3, 25 mana and cooldown 3; party composition controls the support value.",
  ),
  "vital-strike": estimateMight(
    "spells",
    190,
    "Retain 190: STR66 previews 36.74/6.82 damage and heals half actual damage. Zero mana, cooldown 2, melee access and reliable wounded-caster sustain distinguish it from plain attacks; capped damage and missing HP constrain recovery.",
  ),
} satisfies Record<SpellType, MightAssessment>;
