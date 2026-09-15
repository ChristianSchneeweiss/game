import type { ItemType } from "../items/item-types";
import type { PassiveType } from "../passive-skills/base/passive-types";
import type { MightAssessment } from "./might";
import { estimateMight } from "./references";
import { tieredEquipmentAssessments } from "./tiered-equipment-assessments";

export const itemAssessments = {
  ...tieredEquipmentAssessments,
  "emberguard-mail": estimateMight(
    "armor",
    120,
    "Retain 120: compared with the cuirass, trade two armor for six MR. Mixed-pressure pairs confirm a modest survival benefit; the two defenses apply to separate hits. Fresh 128 paired slot trials on tank builds: mean damage change 3.59, remaining-HP change 24.03, deaths 32 → 32. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "gravewarden-plate": estimateMight(
    "armor",
    180,
    "Retain 180: +18 armor/+8 MR offer repeated mixed mitigation, discounted for movement 3 → 2. Slot trials cover tank and agility builds; movement-only approach cases expose missed opening attacks at relevant distances. Fresh 256 paired slot trials on agility/tank builds: mean damage change 18.71, remaining-HP change 51.58, deaths 128 → 128. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "int-armor": estimateMight(
    "armor",
    80,
    "Retain 80: +10 INT supplies scaling and +2 derived mana regeneration, with no physical mitigation. Caster swaps confirm more damage but lower surviving health than Iron Cuirass. The INT bonus does not increase maximum mana. Fresh 128 paired slot trials on caster builds: mean damage change 55.27, remaining-HP change -14.53, deaths 92 → 96. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "iron-cuirass": estimateMight(
    "armor",
    100,
    "Retain the 100-Might armor anchor: +12 physical prevention per eligible hit. It grants no MR, extra movement or active effect. Fresh 128 paired slot trials on tank builds: mean damage change 0, remaining-HP change 0, deaths 32 → 32. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "stormrunner-leathers": estimateMight(
    "armor",
    140,
    "Retain 140: +8 AGI and +1 movement enable agility output and earlier attacks in appropriate layouts. Movement-only pairs isolate the extra attack; losing the cuirass’s armor is a real cost. Fresh 128 paired slot trials on agility builds: mean damage change 11.18, remaining-HP change -18, deaths 96 → 96. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "tidewoven-robes": estimateMight(
    "armor",
    100,
    "Retain 100: +6 INT and +5 Blessed trade fixed scaling for better damage/healing rolls. Caster slot trials show a real offensive alternative, with neither flat armor nor MR. Blessed is not proc chance. Fresh 128 paired slot trials on caster builds: mean damage change 49.91, remaining-HP change -14.72, deaths 92 → 96. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "ashen-falchion": estimateMight(
    "weapons",
    170,
    "Retain 170: +10 STR and +4 physical penetration improve attacks and eligible spells over Iron Sword; melee profile is 3–18 +25% STR. Paired output supports its moderate premium, without a reach or sustain bonus. Fresh 128 paired slot trials on physical builds: mean damage change 46.64, remaining-HP change 0.7, deaths 96 → 96. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "hollow-scepter": estimateMight(
    "weapons",
    220,
    "Retain 220: +10 INT, +5 magic penetration and 2–14 +25% INT attacks at range 3. Penetration benefits staff and spell hits; the extra output is measured without inventing physical protection. Fresh 128 paired slot trials on caster builds: mean damage change 52.28, remaining-HP change 1.09, deaths 92 → 92. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "iron-sword": estimateMight(
    "weapons",
    100,
    "Retain the 100-Might weapon anchor: +6 STR, melee 0–15 +25% STR, including physical spell scaling. Flat armor suppresses weak attacks; reach is one tile. Fresh 128 paired slot trials on physical builds: mean damage change 0, remaining-HP change 0, deaths 96 → 96. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "oakwarden-staff": estimateMight(
    "weapons",
    150,
    "Retain 150: +8 INT, comparable 25% main-stat basic scaling at range 3 and +1.6 derived mana recovery. Weapon trials hold Iron Cuirass and all accessories fixed; reach and spell access support the established premium over the sword. Fresh 128 paired slot trials on caster builds: mean damage change 0, remaining-HP change 0, deaths 92 → 92. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "stormfang-blade": estimateMight(
    "weapons",
    200,
    "Retain 200: +8 AGI and +8 percentage points of crit, with 30% AGI plus 10% STR basic scaling. The equal-budget agility build supplies the compatible comparison; initiative and critical interactions matter, while melee access limits it. Fresh 128 paired slot trials on agility builds: mean damage change 38.26, remaining-HP change -6.68, deaths 96 → 96. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
  "tideglass-staff": estimateMight(
    "weapons",
    180,
    "Retain 180: +10 INT and +3 flat mana recovery, range 3, slightly weaker 0–12 base attack than Oakwarden. Extra mana is credited only when spent; the paired caster rotation supports the small sustain premium. Fresh 128 paired slot trials on caster builds: mean damage change 46.5, remaining-HP change 0.25, deaths 92 → 92. Each comparison holds the other eight slots fixed; endpoints are evidence, not an automatic sum or calibrated score.",
  ),
} satisfies Record<ItemType, MightAssessment>;

export const passiveAssessments = {
  "vital-wellspring": estimateMight(
    "passives",
    340,
    "Reduce 420 → 340: the old rationale used 0.5 × VIT regeneration and quoted 82.32 mean preserved HP. Current tactical characters use 0.375 × VIT: effective VIT61/86 recovers 23/32 after rounding, or 29/40 with this passive (+6/+8 instead of the old +9/+13). Fresh cases below confirm lower sustained recovery. Retain a substantial action-free sustain premium while correcting the obsolete basis; do not also add healing to end health. Canonical 256 pairs: mean remaining-HP change 28.5, damage change 6.27, explicit-healing change 0.63, deaths 128 → 128. Supplemental 256 pairs: remaining-HP change 61.24, damage change 7, explicit-healing change -0.09, deaths 23 → 2. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "arcane-barrier": estimateMight(
    "passives",
    280,
    "Retain 280: reduce post-MR magical damage by 15%; 65 raw versus MR9 becomes 56 then 48 after rounding. Eligible magical periodic/reflected hits also benefit. Physical attacks do not; MR prevention is already accounted for. Canonical 256 pairs: mean remaining-HP change 27.87, damage change 14.88, explicit-healing change 0.5, deaths 128 → 127. Supplemental 256 pairs: remaining-HP change 36.52, damage change 14.73, explicit-healing change 4.53, deaths 32 → 32. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "armor-up": estimateMight(
    "passives",
    280,
    "Retain 280: 28 tank armor becomes 33.6, adding up to 5.6 prevention per eligible physical hit. Zero armor, magical damage and fully blocked hits earn no benefit. Canonical 128 pairs: mean remaining-HP change 36.5, damage change 4.39, explicit-healing change 0.51, deaths 32 → 32. Supplemental 128 pairs: remaining-HP change 48, damage change 0, explicit-healing change 0, deaths 0 → 0. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "blessed-fortune": estimateMight(
    "passives",
    100,
    "Retain 100: +5 to capped damage/healing rolls. Fixed attribute scaling and independent proc/crit rolls do not multiply its contribution; wide roll ranges benefit more. Canonical 256 pairs: mean remaining-HP change 0.23, damage change 10.31, explicit-healing change 0.97, deaths 192 → 192. Supplemental 256 pairs: remaining-HP change 0.93, damage change 17.2, explicit-healing change 1.23, deaths 55 → 55. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  bloodfang: estimateMight(
    "passives",
    160,
    "Retain 160: heal for 10% of actual physical damage on a compatible rotation. Healing and remaining HP overlap; magical hits, overkill and healthy starts do not earn recovery value. Canonical 128 pairs: mean remaining-HP change 5.38, damage change 4.63, explicit-healing change 19.55, deaths 96 → 96. Supplemental 128 pairs: remaining-HP change 38.23, damage change 9.11, explicit-healing change 40.75, deaths 23 → 13. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  executioner: estimateMight(
    "passives",
    180,
    "Retain 180: +20% pre-defense direct damage against enemies already at or below 35% HP. Canonical high-HP targets never expose a useful window and show zero; supplemental 30%-HP targets confirm conditional finishing value. Periodic/reflected hits and overkill earn nothing. Canonical 256 pairs: mean remaining-HP change 0, damage change 0, explicit-healing change 0, deaths 192 → 192. Supplemental 256 pairs: remaining-HP change 22.74, damage change 96.92, explicit-healing change 9.66, deaths 49 → 44. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "fleet-footed": estimateMight(
    "passives",
    140,
    "Retain 140: +1 movement turns an otherwise unreachable opening attack into a legal action in the five-tile approach cases. Stationary canonical pressure shows no gain. Stronger melee spells can use that same opening; do not assume permanent avoidance. Canonical 128 pairs: mean remaining-HP change 0, damage change 0, explicit-healing change 0, deaths 96 → 96. Supplemental 128 pairs: remaining-HP change 0, damage change 10.02, explicit-healing change 0, deaths 32 → 32. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "keen-instincts": estimateMight(
    "passives",
    330,
    "Retain 330: actual ring/glove crit12% becomes 15%, with 2.5× critical hits instead of 2×. Outcomes span a useful range that supports stability. No synthetic crit is granted; zero-crit builds remain inactive. Canonical 256 pairs: mean remaining-HP change 0.88, damage change 42.61, explicit-healing change 3.35, deaths 192 → 192. Supplemental 256 pairs: remaining-HP change 3.65, damage change 70.72, explicit-healing change 4.58, deaths 55 → 54. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "last-bastion": estimateMight(
    "passives",
    200,
    "Retain 200: reduce post-defense damage by 20% only while already at or below 35% HP. The threshold-crossing hit is unchanged. Forced-low-health sensitivity exposes survival and extra actions without assuming it is always active. Canonical 256 pairs: mean remaining-HP change 12.54, damage change 13.57, explicit-healing change 1.95, deaths 128 → 118. Supplemental 256 pairs: remaining-HP change 53.44, damage change 71.91, explicit-healing change 4.55, deaths 182 → 73. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "merciful-light": estimateMight(
    "passives",
    220,
    "Retain 220: +25% healing when each recipient starts a heal at or below half HP. Actual Nature’s Embrace pairs at 25% starting health add 34.13 useful healing across two recipients. Canonical Soulflare/upkeep cases also activate it. Current mana upkeep goes through the healing calculator and can receive the conditional bonus; do not count resource/health endpoints twice. Canonical 128 pairs: mean remaining-HP change 3.75, damage change 36.25, explicit-healing change -19.64, deaths 96 → 96. Supplemental 128 pairs: remaining-HP change 16.33, damage change 70.37, explicit-healing change -10.91, deaths 32 → 30. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "mystic-flow": estimateMight(
    "passives",
    140,
    "Retain 140: caster INT82 and the charm supply 17.4 mana recovery; multiplying by 1.25 yields 21.75 before rounding (17 → 22). Price mana only when it enables useful actions. Canonical 128 pairs: mean remaining-HP change 0, damage change 25.28, explicit-healing change -20.31, deaths 96 → 96. Supplemental 128 pairs: remaining-HP change -0.8, damage change 53.16, explicit-healing change -17.34, deaths 32 → 32. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "predators-focus": estimateMight(
    "passives",
    300,
    "Retain 300: add 10 percentage points of crit (12% → 22%), including from zero. Critical gear and Keen enable further interaction, while chance caps and overkill limit useful damage. Canonical 256 pairs: mean remaining-HP change 0.43, damage change 40.69, explicit-healing change 2.34, deaths 192 → 192. Supplemental 256 pairs: remaining-HP change 2.15, damage change 52.88, explicit-healing change 2.73, deaths 55 → 53. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  soulleech: estimateMight(
    "passives",
    180,
    "Retain 180: the implemented omnivamp branch heals 5% of nonphysical damage. Caster rotations supply eligible hits; physical damage receives nothing and overhealing is discounted. Canonical 128 pairs: mean remaining-HP change 7.3, damage change 18.48, explicit-healing change 21.92, deaths 96 → 96. Supplemental 128 pairs: remaining-HP change 24.76, damage change 17.75, explicit-healing change 35.83, deaths 32 → 32. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "stoneform-resolve": estimateMight(
    "passives",
    340,
    "Retain 340: gain +1 Armor/MR per completed round from zero, capped at 15. Multiple hits and long fights expose its accumulating benefit; no full starting stacks and no double credit for both defenses on one hit. Canonical 128 pairs: mean remaining-HP change 45.98, damage change 7.15, explicit-healing change 0.71, deaths 32 → 32. Supplemental 128 pairs: remaining-HP change 75.94, damage change -3.19, explicit-healing change -0.37, deaths 0 → 0. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "thorn-carapace": estimateMight(
    "passives",
    300,
    "Retain 300: reflect 20% of post-defense damage through attacker defenses, without reducing the incoming hit. Flat defense can erase the reflected hit; do not add a second generic uniqueness premium. Canonical 128 pairs: mean remaining-HP change -3.33, damage change 69.25, explicit-healing change -2.05, deaths 32 → 32. Supplemental 128 pairs: remaining-HP change -4.72, damage change 37, explicit-healing change -2.06, deaths 0 → 0. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
  "titans-resurgence": estimateMight(
    "passives",
    260,
    "Retain 260: once per battle at round start at or below 30% HP, four 7.5%-max-HP ticks nominally total 165/240 HP before rounding. Forced-low-health cases verify activation, not everyday trigger frequency. Canonical 256 pairs: mean remaining-HP change 34.79, damage change 23.89, explicit-healing change 95.36, deaths 128 → 93. Supplemental 256 pairs: remaining-HP change 159.26, damage change 111.52, explicit-healing change 208.85, deaths 182 → 51. These endpoints overlap and are not added into a Might formula; see each artifact’s distinct activation conditions.",
  ),
} satisfies Record<PassiveType, MightAssessment>;
