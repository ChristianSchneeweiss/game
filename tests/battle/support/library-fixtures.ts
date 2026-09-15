import { mightAssessments } from "../../../apps/game/src/might/assessments";
import type { MightAssessment } from "../../../apps/game/src/might/might";

/** Synthetic UI/contract evidence only; these numbers are not content valuations. */
export function fixtureAssessment(
  might: number,
  status: MightAssessment["status"] = "assessed",
): MightAssessment {
  return {
    might,
    status,
    referenceId: "test-only/reference",
    conditions: "Isolated test conditions; not a calibrated game reference.",
    rationale:
      "Synthetic value to exercise Library behavior, not a balance claim.",
  };
}

export function installLibraryAssessments() {
  const original = structuredClone(mightAssessments);
  Object.assign(mightAssessments, {
    spells: {},
    items: {},
    passives: {},
    enemies: {},
  });
  mightAssessments.spells.fireball = fixtureAssessment(190);
  mightAssessments.spells["basic-attack"] = fixtureAssessment(0);
  mightAssessments.spells["single-heal"] = fixtureAssessment(189, "estimated");
  mightAssessments.items["iron-sword"] = fixtureAssessment(190);
  mightAssessments.items["iron-cuirass"] = fixtureAssessment(500, "estimated");
  mightAssessments.passives["armor-up"] = fixtureAssessment(138, "estimated");
  mightAssessments.enemies["ashen-skeleton"] = fixtureAssessment(263);
  return () => Object.assign(mightAssessments, original);
}
