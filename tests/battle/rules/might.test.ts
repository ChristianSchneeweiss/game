import { expect, test } from "bun:test";
import { assessMight, tierFromMight } from "../../../apps/game/src/might/might";
import { fixtureAssessment } from "../support/library-fixtures";

test("Might tier boundaries are inclusive and S is open", () => {
  for (const [might, tier] of [
    [0, "E"],
    [100, "E"],
    [137, "E"],
    [138, "D"],
    [139, "D"],
    [189, "D"],
    [190, "C"],
    [191, "C"],
    [262, "C"],
    [263, "B"],
    [264, "B"],
    [361, "B"],
    [362, "A"],
    [363, "A"],
    [499, "A"],
    [500, "S"],
    [501, "S"],
    [1000, "S"],
    [Number.MAX_SAFE_INTEGER, "S"],
  ] as const)
    expect(tierFromMight(might)).toBe(tier);
});

test("missing assessments have one explicit state, distinct from zero", () => {
  const missing = {
    might: null,
    tier: null,
    assessmentStatus: "unrated" as const,
    referenceId: null,
  };
  expect(assessMight("spells:test", undefined)).toEqual(missing);
  expect(assessMight("spells:test", null)).toEqual(missing);
  expect(assessMight("spells:test", fixtureAssessment(0))).toMatchObject({
    might: 0,
    tier: "E",
    assessmentStatus: "assessed",
  });
  expect(
    assessMight("spells:test", fixtureAssessment(190, "estimated")),
  ).toMatchObject({ might: 190, tier: "C", assessmentStatus: "estimated" });
});

test("invalid values and incomplete evidence fail with the content identity", () => {
  for (const value of [
    -1,
    0.5,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "190",
    "",
    null,
    undefined,
    true,
    {},
    [],
  ]) {
    expect(() => tierFromMight(value as number)).toThrow();
    expect(() =>
      assessMight("spells:fireball", {
        ...fixtureAssessment(190),
        might: value,
      }),
    ).toThrow("spells:fireball");
  }
  for (const value of [
    [],
    190,
    "190",
    {},
    { ...fixtureAssessment(190), status: "Unrated" },
    { ...fixtureAssessment(190), tier: "A" },
  ]) {
    expect(() => assessMight("items:iron-sword", value)).toThrow(
      "items:iron-sword",
    );
  }
  for (const field of ["referenceId", "conditions", "rationale"]) {
    for (const value of ["", "  ", undefined, 42]) {
      expect(() =>
        assessMight("enemies:goblin", {
          ...fixtureAssessment(190),
          [field]: value,
        }),
      ).toThrow("enemies:goblin");
    }
  }
});
