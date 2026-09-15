import type { MightAssessment } from "./might";

/** Authored v3 conditions; see the executable reference-profile.ts and probes. */
const lateMidGameBuilds =
  "Reference v3: late-mid-game design benchmark, level 31 and 160 base points (40 starting + 30 × 4). Physical STR60/INT20/VIT55/AGI25; caster STR20/INT60/VIT55/AGI25; tank STR35/INT20/VIT80/AGI25; agility STR25/INT20/VIT55/AGI60. Real E–B gear from reference-profile.ts fills all nine slots; no synthetic armor, MR or crit. Effective physical STR66/INT24/VIT61/AGI45; caster STR20/INT82/VIT61/AGI45; tank STR41/INT24/VIT86/AGI45; agility STR25/INT24/VIT61/AGI88. Base HP 550/550/800/550 and mana 100/300/100/100 remain unchanged by gear. Armor 28/16/28/28, MR9; crit12% except agility20%, crit damage 2×. Four compatible spells plus Basic Attack; 6/12 rounds, full and 55%-HP/10%-mana starts. Actual tactical health regeneration is 0.375 × effective VIT before rounding. Equal attribute progression and gear-access ceiling, not a sum of item Might.";
const references = {
  spells: {
    anchor: "spells-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "100 Might remains an immediate single-target action delivering 20 useful damage at range 1–3 for 10 mana and configured cooldown 1. Compare compatible builds against 0 or 30 armor/20 MR, about 1.5 local or 2 global useful targets, 1–2 allies. Judge useful healing, control, prevention, timing and mana together. Charge costs the cast plus one blocked activation; count each delay/lost action once. Previews and scripted sequences are evidence, not whole-spell scores.",
  },
  passives: {
    anchor: "passives-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "100 Might remains approximately 20 useful HP of marginal encounter contribution without casting. Canonical matched probes use two 1500-HP threats, 65 raw physical/magical pressure before the hero, 16 fixed seeds, 6/12 rounds, both resource and defense cases. Supplemental 45-raw, low-health, finishing, healing and movement cases are identified separately. Do not add healing twice through remaining HP, or value unspent mana. All estimates remain provisional.",
  },
  weapons: {
    anchor: "weapons-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Iron Sword remains the 100-Might weapon anchor; Oakwarden remains the established 150-Might caster peer. Use compatible equal-160-point builds, Iron Cuirass and the same accessories for every weapon comparison. Within a pair, swap only weapon. Include range, weapon-specific scaling and spent recovery; report caster-peer comparisons separately from physical anchor comparisons.",
  },
  armor: {
    anchor: "armor-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Iron Cuirass (+12 armor) remains the 100-Might armor anchor. Swap armor only on compatible equal-budget builds, preserving weapon and accessories. Include repeated mitigation, scaling, spent mana and movement penalties. Armor and MR protect different hits.",
  },
  ring: {
    anchor: "rings-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Copper Band (+3 STR) remains the 100-Might anchor for this slot. Hold the other eight slots fixed. Include only compatible scaling, prevention, useful recovery, spent mana and attacks actually enabled by movement. VIT/INT gear does not increase maximum HP/mana. Paired slot and movement-only probes are provisional evidence; there is no summed character Might.",
  },
  amulet: {
    anchor: "amulets-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Apprentice Pendant (+3 INT) remains the 100-Might anchor for this slot. Hold the other eight slots fixed. Include only compatible scaling, prevention, useful recovery, spent mana and attacks actually enabled by movement. VIT/INT gear does not increase maximum HP/mana. Paired slot and movement-only probes are provisional evidence; there is no summed character Might.",
  },
  boots: {
    anchor: "boots-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Trailworn Boots (+3 AGI) remains the 100-Might anchor for this slot. Hold the other eight slots fixed. Include only compatible scaling, prevention, useful recovery, spent mana and attacks actually enabled by movement. VIT/INT gear does not increase maximum HP/mana. Paired slot and movement-only probes are provisional evidence; there is no summed character Might.",
  },
  gloves: {
    anchor: "gloves-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Brawler’s Wraps (+3 STR) remains the 100-Might anchor for this slot. Hold the other eight slots fixed. Include only compatible scaling, prevention, useful recovery, spent mana and attacks actually enabled by movement. VIT/INT gear does not increase maximum HP/mana. Paired slot and movement-only probes are provisional evidence; there is no summed character Might.",
  },
  helmet: {
    anchor: "helmets-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Iron Cap (+3 armor) remains the 100-Might anchor for this slot. Hold the other eight slots fixed. Include only compatible scaling, prevention, useful recovery, spent mana and attacks actually enabled by movement. VIT/INT gear does not increase maximum HP/mana. Paired slot and movement-only probes are provisional evidence; there is no summed character Might.",
  },
  cloak: {
    anchor: "cloaks-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Traveler’s Cloak (+3 MR) remains the 100-Might anchor for this slot. Hold the other eight slots fixed. Include only compatible scaling, prevention, useful recovery, spent mana and attacks actually enabled by movement. VIT/INT gear does not increase maximum HP/mana. Paired slot and movement-only probes are provisional evidence; there is no summed character Might.",
  },
  belt: {
    anchor: "belts-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Rope Girdle (+3 VIT) remains the 100-Might anchor for this slot. Hold the other eight slots fixed. Include only compatible scaling, prevention, useful recovery, spent mana and attacks actually enabled by movement. VIT/INT gear does not increase maximum HP/mana. Paired slot and movement-only probes are provisional evidence; there is no summed character Might.",
  },
  enemies: {
    anchor: "enemies-v3",
    conditions:
      lateMidGameBuilds +
      " " +
      "Skeleton Grunt remains the 100-Might enemy anchor. Test actual unscaled kits against the level-31 physical/caster party (caster base STR21/AGI24 to fix order while preserving 160 points), singly and as trios, clustered/spread 7×7 layouts, 16 fixed seeds, movement and shared AI, 18-round cap. Loot is separate from equipped combat gear. All current canonical runs are party wins; zero pressure from early enemies is a measurement floor, not zero Might. Preserve intrinsic durability, control and support distinctions.",
  },
} as const;

export function estimateMight(
  reference: keyof typeof references,
  might: number,
  rationale: string,
): MightAssessment {
  const { anchor, conditions } = references[reference];
  return {
    might,
    status: "estimated",
    referenceId: `docs/might/assessments.md#${anchor}`,
    conditions,
    rationale,
  };
}
