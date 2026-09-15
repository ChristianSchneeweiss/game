import { expect, test } from "bun:test";
import { BM } from "../../../apps/game/src/bm";
import { BaseEntity } from "../../../apps/game/src/base-entity";
import { MIGHT_REFERENCE } from "../../../apps/game/src/might/reference-profile";
import { EnemyTypeSchema } from "../../../apps/game/src/enemies/base/enemy-types";
import { createEnemyFromType } from "../../../apps/game/src/enemies/enemy-factory";
import {
  quiet,
  referenceHero,
} from "../../../scripts/might-assessment/reference";
import {
  measureSequence,
  type SequenceCase,
} from "../../../scripts/might-assessment/sequence-probes";
import {
  measurePressure,
  type PressureCase,
} from "../../../scripts/might-assessment/slot-probes";

test("baseline spell kits have normal enemy-drop sources at equal progression budgets", () => {
  const drops = new Set(
    EnemyTypeSchema.options.flatMap(({ value }) =>
      createEnemyFromType(value, value).loot.items.flatMap((drop) =>
        drop.type === "SPELL" ? [drop.data.spellType] : [],
      ),
    ),
  );
  for (const profile of Object.values(MIGHT_REFERENCE.profiles)) {
    expect(
      Object.values(profile.attributes).reduce((sum, value) => sum + value, 0),
    ).toBe(160);
    for (const spell of profile.spells) {
      expect(drops.has(spell)).toBe(true);
    }
  }
});

test("real reference gear supplies crit and defenses without changing maximum resources", () => {
  const hero = referenceHero("caster");
  const target = new BaseEntity("target", "target", "TEAM_B", 100, 0, {
    strength: 1,
    intelligence: 1,
    vitality: 1,
    agility: 1,
  });
  expect(
    MIGHT_REFERENCE.armor +
      MIGHT_REFERENCE.magicResistance +
      MIGHT_REFERENCE.critChance,
  ).toBe(0);
  expect(Object.keys(hero.equipped)).toHaveLength(9);
  new BM([hero, target], "reference-gear-check", {
    rulesVersion: 2,
    battlefield: {
      width: 5,
      height: 5,
      blocked: [],
      layoutVersion: "might-check",
    },
    positions: { hero: { x: 1, y: 2 }, target: { x: 2, y: 2 } },
  });
  expect(hero.getAttribute("intelligence")).toBe(82);
  expect(hero.getAttribute("vitality")).toBe(61);
  expect(hero.getAttribute("critChance")).toBeCloseTo(0.12);
  expect(hero.getAttribute("armor")).toBe(16);
  expect(hero.getAttribute("magicResistance")).toBe(9);
  expect(hero.getAttribute("healthRegen")).toBe(22.875);
  expect(hero.maxHealth).toBe(550);
  expect(hero.maxMana).toBe(300);
});

test("charge probes preserve one blocked activation and cancel a dead caster’s release", () =>
  quiet(() => {
    const input: SequenceCase = {
      type: "arcane-channeling",
      build: "caster",
      count: 3,
      armored: false,
      pressure: 0,
      seed: "charge-measurement-check",
    };
    const charged = measureSequence(input);
    const immediate = measureSequence({ ...input, variant: "immediate" });
    expect(charged.used).toBe(true);
    expect(charged.blocked).toEqual([{ round: 1, actor: "hero" }]);
    expect(immediate.heroActions - charged.heroActions).toBe(1);
    expect(measureSequence({ ...input, casterLoss: true }).damage).toBe(0);
    expect(
      measureSequence({ ...input, casterLoss: true, variant: "immediate" })
        .damage,
    ).toBeGreaterThan(0);
  }));

test("movement-only probes expose a heavy armor opening-action cost", () =>
  quiet(() => {
    const input: PressureCase = {
      build: "physical",
      rounds: 2,
      depleted: false,
      armored: false,
      approach: true,
      approachDistance: 4,
      rawPressure: 45,
      basicOnly: true,
      item: "gravewarden-plate",
      seed: "movement-measurement-check",
    };
    const baseline = measurePressure({ ...input, removeMovementBonus: true });
    const treatment = measurePressure(input);
    expect(baseline.effective.armor).toBe(treatment.effective.armor);
    expect(baseline.effective.magicResistance).toBe(
      treatment.effective.magicResistance,
    );
    expect(baseline.firstCastRound).toBe(0);
    expect(treatment.firstCastRound).toBe(1);
    expect(baseline.casts - treatment.casts).toBe(1);
  }));

test("healing probes activate Merciful Light only for a suitably wounded recipient", () =>
  quiet(() => {
    const input: SequenceCase = {
      type: "natures-embrace",
      build: "caster",
      count: 1,
      armored: false,
      pressure: 0,
      healthFraction: 0.25,
      seed: "healing-measurement-check",
      rounds: 1,
    };
    expect(
      measureSequence({ ...input, passive: "merciful-light" }).healing,
    ).toBeGreaterThan(measureSequence(input).healing);
    expect(
      measureSequence({
        ...input,
        healthFraction: 0.75,
        passive: "merciful-light",
      }).healing,
    ).toBe(measureSequence({ ...input, healthFraction: 0.75 }).healing);
  }));
