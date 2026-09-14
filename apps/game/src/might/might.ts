import type { EquipmentSlot } from "../items/equipment/equipment";
import type { Tier } from "../types";

export type MightFamily =
  | "spells"
  | "passives"
  | "enemies"
  | `items:${Lowercase<EquipmentSlot>}`;

export type MightAssessment = {
  might: number;
  status: "estimated" | "assessed";
  referenceId: string;
  conditions: string;
  rationale: string;
};

export type MightRating =
  | { might: null; tier: null; assessmentStatus: "unrated"; referenceId: null }
  | {
      might: number;
      tier: Tier;
      assessmentStatus: MightAssessment["status"];
      referenceId: string;
    };

/** Each promotion is rounded once from the original exponential expression. */
const promotions = (["D", "C", "B", "A", "S"] as const).map((tier, index) => ({
  tier,
  minimum: Math.round(100 * 5 ** ((index + 1) / 5)),
}));

export function isMight(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function tierFromMight(might: number): Tier {
  if (!isMight(might))
    throw new Error("Might must be a nonnegative safe integer");
  return promotions.findLast(({ minimum }) => might >= minimum)?.tier ?? "E";
}

/** The authoring boundary: missing metadata is Unrated, malformed metadata fails. */
export function assessMight(content: string, assessment: unknown): MightRating {
  if (assessment === undefined || assessment === null) {
    return {
      might: null,
      tier: null,
      assessmentStatus: "unrated",
      referenceId: null,
    };
  }
  if (typeof assessment !== "object" || Array.isArray(assessment)) {
    throw new Error(
      `Invalid Might assessment for ${content}: expected an assessment`,
    );
  }
  const data = assessment as Record<string, unknown>;
  if (!isMight(data.might)) {
    throw new Error(
      `Invalid Might assessment for ${content}: Might must be a nonnegative safe integer`,
    );
  }
  if (data.status !== "estimated" && data.status !== "assessed") {
    throw new Error(
      `Invalid Might assessment for ${content}: expected Estimated or Assessed status`,
    );
  }
  for (const field of ["referenceId", "conditions", "rationale"] as const) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      throw new Error(
        `Invalid Might assessment for ${content}: missing ${field}`,
      );
    }
  }
  if ("tier" in data) {
    throw new Error(
      `Invalid Might assessment for ${content}: tier is derived, not authored`,
    );
  }
  return {
    might: data.might,
    tier: tierFromMight(data.might),
    assessmentStatus: data.status,
    referenceId: data.referenceId as string,
  };
}

export function mightFamilyLabel(family: MightFamily): string {
  if (family === "spells") return "Spells";
  if (family === "passives") return "Passive skills";
  if (family === "enemies") return "Enemies";
  const slot = family.slice("items:".length);
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}
