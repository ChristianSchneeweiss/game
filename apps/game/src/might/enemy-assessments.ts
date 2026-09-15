import type { EnemyType } from "../enemies/base/enemy-types";
import type { MightAssessment } from "./might";
import { estimateMight } from "./references";

export const enemyAssessments = {
  goblin: estimateMight(
    "enemies",
    45,
    "20 HP and low offense, despite its armor/Blessed/equipment. Both solo and three-goblin groups died before completing the opening round and caused no damage to the developed party. Retain a small nonzero intrinsic valuation below the 45-HP Skeleton Grunt anchor.",
  ),
  "skeleton-grunt": estimateMight(
    "enemies",
    100,
    "Enemy unit anchor remains 100 for its 45 HP and free Crude Strike. The developed party defeats it and groups of three in the opening round without taking damage. The anchor fixes units; it does not claim this is an appropriate endgame opponent.",
  ),
  "rotting-corpse": estimateMight(
    "enemies",
    150,
    "80 HP and a front-arc attack offer more durability and potential coverage than the anchor. Groups lasted 0.66 rounds on average but dealt no damage through the developed party's defenses; reduce the earlier pressure/survival premium.",
  ),
  "wisp-of-regret": estimateMight(
    "enemies",
    95,
    "40 HP with ranged Cinder Wisp and a small mana pool. Reach offsets some lower durability than the anchor, but solo and grouped probes ended in the opening round with no party damage. Its unscaled enemy INT14 is not replaced by the caster reference's INT98.",
  ),
  "ghoul-knight-ivern": estimateMight(
    "enemies",
    260,
    "150 HP with Vital Strike and Festering Blow. Developed defenses prevented measurable damage and lifesteal in these probes; groups lasted 0.94 rounds on average. Value remaining durability and coverage, with a much smaller sustain premium than v1.",
  ),
  "emberbound-revenant": estimateMight(
    "enemies",
    460,
    "150 HP, INT30, Charred Chains and Soulflare with Soulleech. Solo probes averaged 13.5 party damage; groups averaged 39.84 damage and 9.69 spell/effect healing. Magical pressure still matters, but it no longer threatens party survival under v2.",
  ),
  "ashen-skeleton": estimateMight(
    "enemies",
    110,
    "50 HP, Crude Strike and range-4 Splinter Shot justify a small premium over Skeleton Grunt. Both solo and three-enemy probes ended in the opening round with no party damage; range and armor-reduction potential are modest intrinsic advantages, not observed late-game pressure.",
  ),
  "lurking-flame-wraith": estimateMight(
    "enemies",
    140,
    "60 HP with Cinderbrand, burn and ranged attacks. Groups averaged one round and 4.59 party damage. Fixed burn ticks and low enemy INT14 scale poorly against the developed reference's defenses; do not borrow the high-level spell rating.",
  ),
  "crypt-crawler": estimateMight(
    "enemies",
    90,
    "40 HP, AGI15 and line/arc attacks. Both solo and grouped probes ended in the opening round without damage; its initiative no longer beats the developed party. Some formation coverage remains, but low durability keeps it below the anchor.",
  ),
  "moss-covered-golem": estimateMight(
    "enemies",
    185,
    "90 HP and Crushing Blow's stun chance. Three-enemy groups lasted 0.91 rounds with no party damage; the estimate retains durability and potential action denial, not imaginary late-game armor or guaranteed control.",
  ),
  "barkhide-shaman": estimateMight(
    "enemies",
    120,
    "60 HP, ranged Splinter Shot and Stone Bark. Its own zero armor still makes the percentage buff ineffective. Groups lasted one round without damaging the party; the nominal support kit adds little demonstrated value.",
  ),
  "hollowed-oakwarden": estimateMight(
    "enemies",
    850,
    "260 HP with healing, Blessed Fortune and Titan's Resurgence. Solo probes averaged 309.44 damage absorbed including recovery; trios lasted 5.13 rounds with 391.41 spell/effect healing and 116.5 party damage. Group sustain remains exceptional within the current enemy family, but all probes ended in defeat with no hero deaths.",
  ),
  "elder-treant": estimateMight(
    "enemies",
    400,
    "180 HP, Rootgrasp/Crushing Blow and Stoneform. Solo/group probes lasted 1.31/2.13 rounds, far too short to earn the former long-fight armor premium; party damage averaged 10.44/19.81. Control and durability remain useful relative to lesser enemies.",
  ),
  thundermaw: estimateMight(
    "enemies",
    1000,
    "300 HP, INT40, Volt Lash, Lightning Surge and Thorn Carapace. Solo probes dealt 119.94 party damage; groups of three dealt 456.88 over 4.19 rounds, the strongest measured offensive pressure in this catalogue. All lost without a hero death; 1000 is a relative enemy-family estimate, not evidence of an endgame boss challenge.",
  ),
  "thunder-drake": estimateMight(
    "enemies",
    280,
    "150 HP, Stunning Strike and Festering Blow. Groups averaged 1.22 rounds and 5.22 party damage. Preserve a control/durability premium over simpler enemies while reducing the v1 offensive estimate under developed defenses.",
  ),
  "sky-serpent": estimateMight(
    "enemies",
    300,
    "180 HP, Storm Pulse, Battle Roar and mana regeneration. Groups lasted 1.81 rounds but inflicted no health damage in this probe matrix. Global physical pressure is absorbed by armor; potential control and durability account for its remaining value.",
  ),
  "storm-hatchling": estimateMight(
    "enemies",
    75,
    "40 HP and a weak Staggering Jab with a stun chance. AGI18 is below the new party's initiative, and solo/group probes ended in the opening round without damage. The control opportunity remains unreliable and requires surviving to act.",
  ),
  "skybolt-wyvern": estimateMight(
    "enemies",
    75,
    "35 HP and Festering Blow, with little useful scaling. Solo and grouped probes ended in the opening round without party damage; low durability constrains potential area coverage. Its unused mana provides no additional threat.",
  ),
  "commander-kelvaris": estimateMight(
    "enemies",
    650,
    "220 HP, STR38, AGI30 and strong line/area attacks. Solo/group probes averaged 37.03/132.28 party damage; groups lasted 2.59 rounds. Still a leading current threat, but no longer a party killer. Its own zero crit remains unchanged, so Keen Instincts adds nothing to this enemy despite the reference heroes' crit allowance.",
  ),
  "fishfolk-shaman": estimateMight(
    "enemies",
    145,
    "60 HP, Ocean Blessing and Aqua Wave. Groups generated 29.16 spell healing but lasted only one round and dealt no party damage. Credit observed group recovery, constrained by limited health, damage and action opportunities.",
  ),
  "fishfolk-scout": estimateMight(
    "enemies",
    120,
    "55 HP, Rupture and Crude Strike. A modest durability/bleed premium over Skeleton Grunt, but both solo and group probes ended in the opening round without damage. The small physical hits and bleed ticks are poor against developed armor.",
  ),
  "water-elemental": estimateMight(
    "enemies",
    300,
    "130 HP, INT30, Tidal Pulse, self-healing and Vital Wellspring. Solo probes ended before dealing damage; groups averaged 5.75 party damage and 21.63 spell/effect healing over 0.91 rounds. Sustain potential remains, but the developed party cuts its useful lifetime substantially.",
  ),
} satisfies Record<EnemyType, MightAssessment>;
