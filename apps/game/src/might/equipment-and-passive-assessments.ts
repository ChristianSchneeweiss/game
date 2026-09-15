import type { ItemType } from "../items/item-types";
import type { PassiveType } from "../passive-skills/base/passive-types";
import type { MightAssessment } from "./might";
import { estimateMight } from "./references";

export const itemAssessments = {
  "iron-sword": estimateMight(
    "weapons",
    100,
    "Weapon unit anchor, retained at the developed reference. STR80 becomes 86; its melee profile averages 29 raw damage, about 31.9 including 10% crit against zero armor. Include physical spell scaling; flat enemy armor limits basic attacks.",
  ),
  "oakwarden-staff": estimateMight(
    "weapons",
    150,
    "With the same other gear as the sword comparison, INT80 becomes 88: about 32.45 average undefended damage including reference crit, at range 3. +8 INT also improves spells and adds 1.6 mana regeneration. Reach and casting utility retain the premium; damage type and access remain conditional.",
  ),
  "iron-cuirass": estimateMight(
    "armor",
    100,
    "Armor unit anchor: +12 armor on top of the reference allowance. Prevents up to 12 additional physical damage per hit without using an action, and becomes more useful with multiple attackers and longer fights. Supplies no magic resistance.",
  ),
  "int-armor": estimateMight(
    "armor",
    80,
    "Adds 10 Intelligence and 2 mana regeneration on top of a developed caster. Its marginal spell output and extra mana can matter over 6–12 rounds, particularly with depleted resources, but replacing the cuirass loses repeated physical mitigation. Retain 80 pending paired equipment trials.",
  ),
} satisfies Record<ItemType, MightAssessment>;

export const passiveAssessments = {
  "armor-up": estimateMight(
    "passives",
    280,
    "Tank reference has 30 armor including its cuirass; multiplying by 1.2 adds 6 per eligible physical hit. Across 128 paired pressure cases it preserved 56 additional HP on average with unchanged damage. Value repeated prevention; no effect on already-fully-blocked hits, magical damage or zero-armor builds.",
  ),
  "thorn-carapace": estimateMight(
    "passives",
    300,
    "Reflects 20% of post-defense incoming damage through the attacker's defenses, without reducing the original hit. Paired tank probes gained 69.31 damage on average, with negligible health change. Strong against unarmored attackers, often erased by 30 armor/20 MR; discount that matchup dependence and reflection overkill.",
  ),
  "blessed-fortune": estimateMight(
    "passives",
    100,
    "Adds 5 to the capped damage/heal roll, not to independent proc or crit chance. Physical/caster probes gained 17.77 damage on average. Developed attribute scaling is often a fixed component, so higher base stats do not multiply Blessed's benefit; wide damage ranges and repeated area hits are more favorable.",
  ),
  bloodfang: estimateMight(
    "passives",
    160,
    "10% healing from actual physical damage, evaluated on the developed physical spell rotation. Paired probes gained 33.94 healing, 25.07 remaining HP and 4.84 damage on average; healing and remaining HP describe overlapping benefit and are not added together. No healing from magical damage or overkill; healthy starts waste some recovery.",
  ),
  soulleech: estimateMight(
    "passives",
    180,
    "Current omnivamp implementation heals 5% from the nonphysical damage branch only. Developed caster probes gained 35.41 healing, 24.16 remaining HP and 15.23 damage on average, reducing deaths from 60 to 51 of 128 cases. High-output area magic gives more eligible damage than the old basic-attack reference; no double-counting recovery.",
  ),
  "mystic-flow": estimateMight(
    "passives",
    140,
    "Reference caster INT98 regenerates 19.6 mana per activation, rounded to 20; +25% makes 24.5, rounded to 25. Paired full/depleted-resource probes gained 25.81 damage and ended with 27.54 extra mana on average. Value mana converted into useful actions; leftover mana is not independently credited as damage.",
  ),
  "vital-wellspring": estimateMight(
    "passives",
    420,
    "At VIT70, recovery rises from 35 to 44 after rounding; at VIT100, from 50 to 63. Across physical/tank pressure probes, remaining HP increased by 82.32 on average with 6.31 extra damage. Sustained, action-free recovery is substantial over 6–12 rounds; healthy turns still waste it.",
  ),
  "stoneform-resolve": estimateMight(
    "passives",
    340,
    "Starts at zero and gains +1 Armor and Magic Resistance per completed round, capped at 15 per battle. Paired tank probes preserved 67.5 HP on average with unchanged damage. Multiple attackers and longer fights expose its accumulating value; do not award all stacks initially or count armor and MR against the same hit twice.",
  ),
  "titans-resurgence": estimateMight(
    "passives",
    260,
    "Once per battle below the activation threshold, four 7.5%-max-HP ticks total a nominal 210 HP on the 700-HP physical build or 300 on the 1000-HP tank, before rounding. Paired probes averaged 52.52 extra healing and reduced deaths from 32 to 16 of 256 cases. Many runs never trigger or cannot collect every tick; the full nominal heal is not guaranteed.",
  ),
  "keen-instincts": estimateMight(
    "passives",
    330,
    "Under the explicit 10% endgame reference crit allowance, chance becomes 12.5% and a 2x critical hit becomes 2.5x. Physical/caster probes gained 66.14 damage on average. This allowance is a design assumption, not a new live character stat; at the current zero-crit starting build the passive still contributes zero.",
  ),
} satisfies Record<PassiveType, MightAssessment>;
