import type { SpellType } from "../spells/base/spell-types";
import type { MightAssessment } from "./might";
import { estimateMight } from "./references";

export const spellAssessments = {
  "basic-attack": estimateMight(
    "spells",
    120,
    "Developed physical/caster weapons average 31.9/35.2 damage against zero defense and about 5.7/15.2 against the defended reference, including 10% crit. Free and repeatable; staff reaches 3 tiles. Rated equipped, unlike the Library's unarmed preview.",
  ),
  fireball: estimateMight(
    "spells",
    65,
    "At caster INT98, about 21.8 expected damage undefended and 6.4 against 20 MR, including reference crit. Range 3, 10 mana, cooldown 2; weak scaling and broad roll variance keep it modest despite higher stats.",
  ),
  "single-heal": estimateMight(
    "spells",
    55,
    "Caster INT98 gives 12.4 mean healing at range 3 for 10 mana and cooldown 2. Small relative to developed health pools and 35+ natural recovery, though immediate rescue can matter. Count only useful missing HP.",
  ),
  "crude-strike": estimateMight(
    "spells",
    25,
    "Still only 8 raw mean melee damage with no attribute scaling, free and repeatable. Reference armor can absorb it entirely; a 10% -1 Agility proc is a small initiative effect, not action denial.",
  ),
  "festering-blow": estimateMight(
    "spells",
    230,
    "Tank VIT100 gives 42.9 expected physical damage undefended or 12.9 against 30 armor per front-arc target. About 1.5 useful targets, zero mana, cooldown 2, plus conditional 25% vulnerability for follow-up damage. Nearby occupied tiles are not guaranteed targets.",
  ),
  "cinder-wisp": estimateMight(
    "spells",
    105,
    "Caster INT98 gives about 31.5/11.5 expected damage against zero/20 MR. Range 3, 10 mana and cooldown 1; the mixed-defense comparison is close to the 20-useful-damage unit.",
  ),
  "vital-strike": estimateMight(
    "spells",
    190,
    "Physical STR86 gives about 42.7/12.7 expected damage against zero/30 armor, with healing equal to half actual damage. Free, cooldown 2, melee access. Wounded developed builds can use the sustain, but defenses, overhealing and overkill limit it.",
  ),
  "splinter-shot": estimateMight(
    "spells",
    35,
    "Unscaled 8 raw mean physical damage at range 4, free with cooldown 1. High armor blocks the attack; its 20% chance of a brief 10% armor reduction has greater follow-up potential against armored enemies, but remains unreliable and timing-dependent.",
  ),
  cinderbrand: estimateMight(
    "spells",
    165,
    "Caster INT98 gives about 44.4/24.4 expected damage against zero/20 MR. The 30% burn proc remains two small 5-damage ticks, vulnerable to defenses and target death. Costs 15 mana and cooldown 2; higher Intelligence improves the main hit rather than the fixed burn.",
  ),
  "precise-thrust": estimateMight(
    "spells",
    55,
    "At AGI30, about 14.9 expected undefended damage per target along a two-tile line, but 30 armor absorbs it. About 1.5 useful targets, 5 mana and cooldown 1; alignment and weak late-game penetration constrain the package.",
  ),
  soulflare: estimateMight(
    "spells",
    520,
    "Caster INT98 gives about 94.9/74.9 expected damage against zero/20 MR, with half actual damage returned as healing. Strong ranged burst and sustain on a wounded 700-HP caster; discount 40 mana, cooldown 4, overhealing and overkill.",
  ),
  "charred-chains": estimateMight(
    "spells",
    370,
    "Caster INT98 gives about 62.4/42.4 expected magical damage per cross target at range 3. About 1.5 useful targets and a 25% vulnerability proc for timely follow-up, reduced for 25 mana, cooldown 3 and formation dependence.",
  ),
  "crushing-blow": estimateMight(
    "spells",
    135,
    "Physical STR86 gives about 29.9/2.4 expected damage against zero/30 armor. The 30% one-turn stun becomes more valuable against developed opponents even when damage is weak. Free with cooldown 2; requires a reachable surviving enemy.",
  ),
  "stone-bark": estimateMight(
    "spells",
    40,
    "A tank's 30 armor becomes 37.5 for two target end steps, costing an action, 10 mana and cooldown 3. Multiple physical hits can use the extra 7.5 armor, but self-cast consumes the first tick immediately. Still ineffective with zero armor or purely magical incoming damage.",
  ),
  rootgrasp: estimateMight(
    "spells",
    410,
    "Caster INT98 gives about 55.2/35.2 expected magical damage per cross target, plus a 40% one-turn stun chance. Price roughly 1.5 useful targets and denied high-level actions together; 15 mana, cooldown 4 and formation constraints reduce the total.",
  ),
  "verdant-smite": estimateMight(
    "spells",
    360,
    "Caster INT98 gives about 88.9/68.9 expected magical damage at range 3. The 50% armor-reduction proc helps subsequent physical attacks, not this magical hit or magic resistance. Costs 25 mana and cooldown 3.",
  ),
  "natures-embrace": estimateMight(
    "spells",
    500,
    "Caster INT98 heals 78.8 mean HP per ally globally for 35 mana and cooldown 4. Assume about 1.5 wounded recipients in a two-character party; developed health pools and enemy pressure make more healing usable, but healthy recipients and natural regeneration still constrain value.",
  ),
  "lightning-surge": estimateMight(
    "spells",
    720,
    "Caster INT98 gives about 85/65 expected magical damage per enemy against zero/20 MR, globally, plus a 25% stun chance. Reference about two useful targets and stronger denied enemy actions; reduce for 50 mana, cooldown 3 and overlapping control.",
  ),
  "stunning-strike": estimateMight(
    "spells",
    245,
    "Physical STR86 gives about 54.3/24.3 expected damage against zero/30 armor, plus a 30% one-turn stun chance. Free with cooldown 2; evaluate meaningful surviving-target action denial alongside melee burst.",
  ),
  "staggering-jab": estimateMight(
    "spells",
    50,
    "Only 5 raw mean melee damage, often completely blocked by armor, but a 20% chance to stun a surviving enemy. Its value comes mainly from occasional denial of stronger actions. Free with cooldown 1; described paralysis is implemented as a stun.",
  ),
  "battle-roar": estimateMight(
    "spells",
    100,
    "60% chance to deny one enemy activation at range 2, without damage. Stronger reference enemy actions raise the control value; it still trades away the caster's action and costs 15 mana with cooldown 3. A failed proc contributes nothing.",
  ),
  "torrent-spiral": estimateMight(
    "spells",
    315,
    "Physical STR86 gives about 61.6/31.6 expected damage per adjacent enemy against zero/30 armor, plus a 25% vulnerability proc. About 1.5 useful surrounding targets; 35 mana, cooldown 4 and close positioning limit value.",
  ),
  "tidepiercer-thrust": estimateMight(
    "spells",
    460,
    "Physical STR86 gives about 81.5/53.8 expected damage per line target against zero/30 armor, including the chance to ignore 25% defense. About 1.5 aligned targets, 25 mana and cooldown 3; penetration now has a meaningful armored case.",
  ),
  "ocean-blessing": estimateMight(
    "spells",
    150,
    "Caster INT98 heals about 35.2 mean HP to one ally at range 3. Costs 20 mana and cooldown 3; useful immediate rescue, with missing-health and natural-regeneration limits on a 700–1000-HP recipient.",
  ),
  "aqua-wave": estimateMight(
    "spells",
    50,
    "Unscaled 12 raw mean magical damage across a front arc; about 13.2 expected undefended or 0.4 against 20 MR including crit. Its 20% -2 Agility proc affects initiative only. About 1.5 useful targets, 10 mana and cooldown 1.",
  ),
  "tidal-pulse": estimateMight(
    "spells",
    310,
    "Caster INT98 gives about 57.4/37.4 expected magical damage per cross target at range 3. About 1.5 useful targets for 30 mana and cooldown 3; the small Agility debuff is not a stun or movement reduction.",
  ),
  "stream-of-life": estimateMight(
    "spells",
    225,
    "Caster INT98 heals 54.2 mean HP to itself for 25 mana and cooldown 4. Larger healing can absorb some developed enemy pressure, but self-only targeting and the attack action forgone reduce flexibility.",
  ),
  rupture: estimateMight(
    "spells",
    35,
    "Unscaled 10 raw mean physical melee damage and a 20% chance of two 4-damage bleed ticks, free with cooldown 1. Late-game armor can erase both the attack and small bleed ticks; delayed ticks also require target survival.",
  ),
  "storm-pulse": estimateMight(
    "spells",
    350,
    "Caster INT98 gives about 54.7/24.7 expected physical damage per target against zero/30 armor, including its bonus proc. Up to three distinct random global enemies; assume two useful targets, 25 mana and cooldown 3. It scales with INT but is resisted by armor.",
  ),
  "volt-lash": estimateMight(
    "spells",
    1250,
    "At caster INT98 each of four hits has 68.8 raw mean magical damage; the total averages about 302.7/222.7 against zero/20 MR with reference crit. Repeated random hits also have 30% stun chances. Discount overlapping stuns, overkill, 35 mana and cooldown 4; high developed-INT burst remains exceptional.",
  ),
  "final-verdict": estimateMight(
    "spells",
    410,
    "Physical STR86 gives about 98.8/68.8 expected melee damage against zero/30 armor for 10 mana and cooldown 2. The <=10%-HP finisher substitutes max health before defenses; credit only useful remaining HP beyond the ordinary strike, not its uncapped coefficient.",
  ),
  "aegis-wall": estimateMight(
    "spells",
    600,
    "Tank VIT100 shields each ally for 45% of that target's max HP: 315–450 on reference recipients. Two-end-step expiry prevents valuing the entire nominal shield on every ally; judge incoming damage actually absorbed. Costs 35 mana and cooldown 6. The implementation still grants no advertised Armor/Magic Resistance bonus.",
  ),
  "bulwark-bash": estimateMight(
    "spells",
    500,
    "Tank VIT100 gives about 79.8/49.8 expected physical damage against zero/30 armor plus a guaranteed one-turn stun. Free, cooldown 2, melee. Stronger denied actions add substantial value; do not also count their prevented damage as a separate full bonus.",
  ),
  earthshatter: estimateMight(
    "spells",
    1100,
    "Tank VIT100 gives about 87.5/57.5 expected physical damage per global enemy, free with cooldown 4. One 50% cast-level roll attempts stuns; two applied stuns grant +20 Armor/MR for the battle. About two useful enemies and a longer horizon make the combined damage, control and persistent protection very strong; the defense bonus fails in single-enemy fights.",
  ),
  "deflecting-stance": estimateMight(
    "spells",
    160,
    "Tank VIT100 reflects 75% of incoming damage through the attacker's defenses, subtracting actual reflection from the incoming hit. Stronger attacks make a well-timed ally cast useful, but one target end step makes self-cast expire immediately. Costs 25 mana and cooldown 4; there is no independent 50% reduction.",
  ),
  "bladestorm-rhythm": estimateMight(
    "spells",
    320,
    "At reference AGI30, two immediate physical strikes average 90 raw total, about 99/39 with crit against zero/30 armor. Its Agility scaling is separate from the physical build's main Strength. Costs 15 mana and cooldown 4; defense applies to each hit, with no charge delay.",
  ),
  "iron-will": estimateMight(
    "spells",
    350,
    "Adds +20 Armor/MR for two target end steps; if the ally is below 30% HP it also restores 70–100 HP on reference builds. Price useful repeated-hit prevention and conditional rescue together, reduced for 20 mana, cooldown 6 and expiry. Cleanses DEBUFF only, not DOT/STUN/CURSE; the reference remains below the 120-VIT longer-duration threshold.",
  ),
  "arcane-channeling": estimateMight(
    "spells",
    780,
    "Caster INT98 releases 186.2 raw magical damage per surviving original enemy, about 204.8/184.8 with crit against zero/20 MR. Two useful targets give about 389.6 mixed-defense damage across the cast and one further blocked activation: roughly 194.8 per committed action before other discounts. Apply delay, caster/target loss, 40 mana and cooldown 6 to reach this estimate. Charging remains a major discount even though high INT greatly increases the discharge.",
  ),
  "fleetfoot-gambit": estimateMight(
    "spells",
    260,
    "Trades the caster's present action for an ally's extra activation next round, costing 50 mana with cooldown 8. Developed recipients can use stronger available abilities and receive another upkeep (35–50 natural HP recovery when injured, plus mana). Value transfer, timing and useful upkeep; self-cast does not create a free net attack and healthy recipients waste recovery.",
  ),
} satisfies Record<SpellType, MightAssessment>;
