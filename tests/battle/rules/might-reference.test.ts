import { expect, test } from "bun:test";
import {
  MIGHT_REFERENCE,
  type MightReferenceBuild,
} from "../../../apps/game/src/might/reference-profile";
import { measurePassive } from "../../../scripts/might-assessment/passives";
import {
  quiet,
  referenceHero,
} from "../../../scripts/might-assessment/reference";

test("late-mid-game comparison builds have equal progression budgets and derived resource pools", () => {
  for (const build of Object.keys(
    MIGHT_REFERENCE.profiles,
  ) as MightReferenceBuild[]) {
    const hero = referenceHero(build);
    const { attributes } = MIGHT_REFERENCE.profiles[build];
    expect(
      Object.values(attributes).reduce((sum, value) => sum + value, 0),
    ).toBe(MIGHT_REFERENCE.attributeBudget);
    expect(hero.maxHealth).toBe(attributes.vitality * 10);
    expect(hero.maxMana).toBe(attributes.intelligence * 5);
    expect(hero.maxHealth).toBeGreaterThan(200);
    expect(hero.spells).toHaveLength(5);
    expect(hero.baseSpecialAttributes.critChance).toBe(
      MIGHT_REFERENCE.critChance,
    );
  }
});

test("paired reference probes measure prevention reproducibly without mutating shared profiles", () => {
  const before = structuredClone(MIGHT_REFERENCE);
  const run = (passive?: "armor-up") =>
    quiet(() =>
      measurePassive(
        "tank",
        6,
        false,
        false,
        "might-reference-regression",
        passive,
      ),
    );
  const baseline = run();
  const treatment = run("armor-up");
  expect(treatment.health).toBeGreaterThan(baseline.health);
  expect(treatment.damage).toBe(baseline.damage);
  expect(run("armor-up")).toEqual(treatment);
  expect(MIGHT_REFERENCE).toEqual(before);
});
