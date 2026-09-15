import type { MightAssessment } from "./might";
import { MIGHT_REFERENCE } from "./reference-profile";

const developedBuilds = `Reference v${MIGHT_REFERENCE.version}: ${MIGHT_REFERENCE.attributeBudget} base attribute points (level-41 budget). Physical STR80/INT20/VIT70/AGI30; caster STR20/INT80/VIT70/AGI30; tank STR50/INT20/VIT100/AGI30. HP = base VIT × 10 (700–1000), mana = base INT × 5 (100–400). Catalogue gear plus explicit design-only allowance of ${MIGHT_REFERENCE.armor} armor, ${MIGHT_REFERENCE.magicResistance} magic resistance and ${MIGHT_REFERENCE.critChance * 100}% crit; these allowances are not currently supplied by shipped gear. Four suitable spells plus Basic Attack, ${MIGHT_REFERENCE.rounds.join("/")}-round horizons, fresh and depleted resources. Compare content in a suitable build, not an average across incompatible builds.`;

/** Versioned design references, not a universal combat-power formula. */
const references = {
  spells: {
    anchor: "spells-v2",
    conditions: `${developedBuilds} Spells: retain 100 Might per reference action delivering 20 useful single-target damage at range 1–3, 10 mana, configured cooldown 1; the HP unit is fixed rather than scaling the old hypothetical reference spell. Check opponents at 0 and 30 armor/20 MR, 1–3 enemies and 1–2 allies; about 1.5 useful local targets and 2 global. Value useful healing, prevention and denied actions alongside damage. Discount mana, cooldown, positioning, actual charge commitments, delay and target loss. Direct-damage estimates include reference crit; they are not whole-spell scores.`,
  },
  passives: {
    anchor: "passives-v2",
    conditions: `${developedBuilds} Passives: retain 100 Might per approximately 20 useful HP of marginal encounter contribution without an action. Matched with/without-passive pressure probes use 16 seeds, 6/12 rounds, full or 55%-HP/10%-mana starts, and two 1500-HP threats each striking for 65 physical/magical raw damage with 0 or 30 armor/20 MR. Compare health, damage, resource use and survival; no automatic sum or score, and no double-counting healing already reflected in remaining health. See passive-probes-v2.json.`,
  },
  weapons: {
    anchor: "weapons-v2",
    conditions: `${developedBuilds} Weapons: Iron Sword remains the 100 anchor. Compare equal-budget physical/caster builds with their main attribute 80 and identical other equipment (Iron Cuirass), holding reference defensive allowances fixed. Include attack profile, reach, spell scaling and regeneration against 0 and 30 armor/20 MR. The weapon unit is separate from armor.`,
  },
  armor: {
    anchor: "armor-v2",
    conditions: `${developedBuilds} Armor: Iron Cuirass (+12 armor) remains the 100 anchor. Hold weapon, base stats and the design-only defensive allowance fixed while swapping the armor slot; compare useful repeated-hit prevention with Intelligence scaling and mana that is actually spent, including depleted-resource fights.`,
  },
  enemies: {
    anchor: "enemies-v2",
    conditions: `${developedBuilds} Enemies: Skeleton Grunt remains the 100 unit anchor; it is not the reference character. Test actual unscaled enemy kits against the developed physical/caster party (caster AGI29), individually and in groups of three. Empty 7x7 board, clustered/spread starts, 16 seeds each, tactical movement and shared heuristic AI, 18-round cap. Current enemies may be outgrown by this party; zero damage is not zero intrinsic power. Judge relative durability, control and group support as well as observed pressure; probe means do not calculate scores. See enemy-probes-v2.json.`,
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
