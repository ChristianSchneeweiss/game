import type { EnemyType } from "../enemies/base/enemy-types";
import type { MightAssessment } from "./might";
import { estimateMight } from "./references";

export const enemyAssessments = {
  "ashen-skeleton": estimateMight(
    "enemies",
    110,
    'Retain 110: 50 HP, range-four Splinter Shot and a brief armor proc support a small premium above the anchor. Own HP 50, mana 15, attributes {"intelligence":3,"vitality":10,"agility":9,"strength":12}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0.41 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "barkhide-shaman": estimateMight(
    "enemies",
    120,
    'Retain 120: 60 HP with Splinter Shot and Stone Bark; zero own armor leaves its self-only percentage buff inactive. New loot does not activate it. Own HP 60, mana 70, attributes {"intelligence":14,"vitality":10,"agility":8,"strength":6}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "commander-kelvaris": estimateMight(
    "enemies",
    650,
    'Retain 650: Own STR38, line/ring attacks and 220 HP remain a leading threat. Keen Instincts is inactive at zero own crit; new crit gear is loot only. Own HP 220, mana 130, attributes {"strength":38,"vitality":22,"agility":30,"intelligence":26}; equipped combat gear: none. Current solo/trio mean party damage 48.94/163, trio mean rounds 3.72 and spell/effect healing 8.59. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "crypt-crawler": estimateMight(
    "enemies",
    90,
    'Retain 90: 40 HP, AGI15 and line/front-arc coverage remain fragile despite intrinsic initiative versus early foes. Own HP 40, mana 40, attributes {"strength":9,"vitality":8,"agility":15,"intelligence":6}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "elder-treant": estimateMight(
    "enemies",
    400,
    'Retain 400: Rootgrasp control, 180 HP and gradual Stoneform stacks retain useful durability without crediting full stacks in short encounters. Own HP 180, mana 80, attributes {"intelligence":16,"vitality":18,"agility":6,"strength":16}; equipped combat gear: none. Current solo/trio mean party damage 14.88/34.28, trio mean rounds 3.25 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "emberbound-revenant": estimateMight(
    "enemies",
    460,
    'Retain 460: INT30 Soulflare and Charred Chains plus Soulleech produce real magical damage and healing; its new equipment/passive drops are not combat bonuses. Own HP 150, mana 150, attributes {"intelligence":30,"vitality":14,"agility":12,"strength":25}; equipped combat gear: none. Current solo/trio mean party damage 36.13/134, trio mean rounds 1.94 and spell/effect healing 36.56. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "fishfolk-scout": estimateMight(
    "enemies",
    120,
    'Retain 120: 55 HP and Rupture offer a small durability/bleed premium over Skeleton Grunt; neither Fleet Footed nor dropped boots are equipped. Own HP 55, mana 30, attributes {"intelligence":6,"vitality":8,"agility":12,"strength":10}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 1 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "fishfolk-shaman": estimateMight(
    "enemies",
    145,
    'Retain 145: Ocean Blessing gives conditional group recovery on a fragile 60-HP body. Its new drops are not worn gear or active passives. Own HP 60, mana 70, attributes {"intelligence":14,"vitality":10,"agility":8,"strength":5}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "ghoul-knight-ivern": estimateMight(
    "enemies",
    260,
    'Retain 260: 150 HP with Vital Strike and Festering Blow give durability and conditional recovery; Gravewarden Plate is loot, not worn armor. Own HP 150, mana 20, attributes {"intelligence":4,"vitality":15,"agility":10,"strength":16}; equipped combat gear: none. Current solo/trio mean party damage 0/0.94, trio mean rounds 1.53 and spell/effect healing 0.59. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  goblin: estimateMight(
    "enemies",
    45,
    'Retain 45: Low HP and weak offense remain below the anchor despite its own Armor Up, Blessed and equipped Int Armor. Own HP 20, mana 0, attributes {"intelligence":1,"vitality":1,"agility":1,"strength":2}; equipped combat gear: int-armor. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "hollowed-oakwarden": estimateMight(
    "enemies",
    850,
    'Retain 850: Group Nature’s Embrace, Blessed Fortune and Titan’s Resurgence retain exceptional sustain. The dropped staff is not equipped. Own HP 260, mana 200, attributes {"intelligence":40,"vitality":26,"agility":10,"strength":18}; equipped combat gear: none. Current solo/trio mean party damage 33.88/178.16, trio mean rounds 7.34 and spell/effect healing 469.63. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "lurking-flame-wraith": estimateMight(
    "enemies",
    140,
    'Retain 140: 60 HP, ranged Cinderbrand and conditional burn remain stronger than simple fragile attackers; fixed burn ticks are strongly defense-limited. Own HP 60, mana 70, attributes {"intelligence":14,"vitality":6,"agility":11,"strength":4}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "moss-covered-golem": estimateMight(
    "enemies",
    185,
    'Retain 185: 90 HP and Crushing Blow’s stun chance justify a durability/control premium; no invented armor is included. Own HP 90, mana 25, attributes {"intelligence":5,"vitality":14,"agility":6,"strength":12}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0.97 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "rotting-corpse": estimateMight(
    "enemies",
    150,
    'Retain 150: 80 HP and front-arc damage justify its durability/coverage premium; developed armor blocks much of its offense. Own HP 80, mana 0, attributes {"intelligence":2,"vitality":8,"agility":6,"strength":14}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0.84 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "skeleton-grunt": estimateMight(
    "enemies",
    100,
    'Retain 100: Keep the fixed enemy unit anchor; its 45 HP and free Crude Strike define the unit, not a late-game challenge. Own HP 45, mana 0, attributes {"intelligence":2,"vitality":10,"agility":8,"strength":12}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "sky-serpent": estimateMight(
    "enemies",
    300,
    'Retain 300: 180 HP, global physical Storm Pulse, Battle Roar and Mystic Flow retain intrinsic durability/control despite armor suppressing health damage. Own HP 180, mana 70, attributes {"strength":24,"vitality":18,"agility":18,"intelligence":14}; equipped combat gear: none. Current solo/trio mean party damage 0/2.19, trio mean rounds 2.97 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "skybolt-wyvern": estimateMight(
    "enemies",
    75,
    'Retain 75: 35 HP and weak Festering scaling limit its area threat; Predator’s Focus and equipment are drops, not active crit sources. Own HP 35, mana 50, attributes {"intelligence":8,"vitality":6,"agility":14,"strength":8}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "storm-hatchling": estimateMight(
    "enemies",
    75,
    'Retain 75: 40 HP and AGI18 with unreliable Staggering Jab stun remain a fragile, conditional control threat. Own HP 40, mana 40, attributes {"intelligence":8,"vitality":8,"agility":18,"strength":8}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "thunder-drake": estimateMight(
    "enemies",
    280,
    'Retain 280: 150 HP, Stunning Strike and Festering Blow retain a control/coverage premium over simpler enemies. Own HP 150, mana 50, attributes {"intelligence":10,"vitality":15,"agility":12,"strength":20}; equipped combat gear: none. Current solo/trio mean party damage 6/6.63, trio mean rounds 2.06 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  thundermaw: estimateMight(
    "enemies",
    1000,
    'Retain 1000: Own INT40, four-hit Volt Lash, Lightning Surge and Thorn Carapace retain the strongest measured group offensive pressure; the dropped Stormfang Blade supplies no crit. Own HP 300, mana 200, attributes {"intelligence":40,"vitality":30,"agility":14,"strength":28}; equipped combat gear: none. Current solo/trio mean party damage 165.06/664.59, trio mean rounds 5.97 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "water-elemental": estimateMight(
    "enemies",
    300,
    'Retain 300: INT30 Tidal Pulse, Stream of Life and Vital Wellspring retain magical pressure and sustain. Base-enemy regeneration is two per activation, so its passive is not valued as character VIT-based recovery. Own HP 130, mana 150, attributes {"intelligence":30,"vitality":13,"agility":9,"strength":6}; equipped combat gear: none. Current solo/trio mean party damage 0/29.34, trio mean rounds 1.5 and spell/effect healing 28.78. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
  "wisp-of-regret": estimateMight(
    "enemies",
    95,
    'Retain 95: Ranged Cinder Wisp offsets some of the low 40 HP; evaluate its own INT14, never character-reference spell output. Own HP 40, mana 40, attributes {"intelligence":14,"vitality":6,"agility":12,"strength":3}; equipped combat gear: none. Current solo/trio mean party damage 0/0, trio mean rounds 0 and spell/effect healing 0. Zero-pressure outcomes cannot distinguish early enemies; intrinsic kit differences support the retained estimate.',
  ),
} satisfies Record<EnemyType, MightAssessment>;
