import { expect, test } from "bun:test";
import { createEnemyFromType } from "../../../apps/game/src/enemies/enemy-factory";
import { EnemyTypeSchema } from "../../../apps/game/src/enemies/base/enemy-types";
import {
  createEnemyLibrary,
  createItemLibrary,
  createPassiveLibrary,
  createSpellLibrary,
} from "../../../apps/game/src/library/catalog";
import { mightAssessments } from "../../../apps/game/src/might/assessments";
import type { LootEntity, Tier } from "../../../apps/game/src/types";
import {
  defaultItemDropRate,
  defaultPassiveDropRate,
  defaultSpellDropRate,
} from "../../../apps/game/src/utils/loot";

test("drop helpers resolve all six actual tiers rather than legacy spell, passive, and equipment labels", () => {
  expect(
    defaultSpellDropRate([
      "crude-strike",
      "cinderbrand",
      "festering-blow",
      "storm-pulse",
      "charred-chains",
      "volt-lash",
    ]).map((drop) => drop.dropRate),
  ).toEqual([0.1, 0.07, 0.04, 0.02, 0.01, 0.003]);
  expect(defaultPassiveDropRate(["armor-up"])[0]!.dropRate).toBe(0.02);
  expect(defaultItemDropRate(["iron-cuirass"])[0]!.dropRate).toBe(0.1);
});

test("every enemy reward uses its displayed tier, including supplies and former guarantees, without a boss bonus", () => {
  const rates: Record<Tier, number> = {
    E: 0.1,
    D: 0.07,
    C: 0.04,
    B: 0.02,
    A: 0.01,
    S: 0.003,
  };
  const tiers = new Map(
    [...createSpellLibrary(), ...createItemLibrary(), ...createPassiveLibrary()].map(
      (entry) => [`${entry.category}:${entry.type}`, entry.tier] as const,
    ),
  );
  for (const enemy of createEnemyLibrary()) {
    for (const drop of enemy.drops ?? []) {
      const tier = tiers.get(`${drop.category}:${drop.type}`);
      expect(tier).toBeDefined();
      expect(tier).not.toBeNull();
      expect(drop.chance).toBe(rates[tier!]);
    }
  }
});

const rewardKey = (drop: LootEntity) => {
  switch (drop.type) {
    case "SPELL":
      return `SPELL:${drop.data.spellType}`;
    case "PASSIVE":
      return `PASSIVE:${drop.data.passiveType}`;
    case "ITEM":
      return `ITEM:${drop.data.itemType}`;
  }
};

test("drop eligibility remains enemy-specific and combat abilities do not become new sources", () => {
  const sources = (key: string) =>
    EnemyTypeSchema.options
      .filter(({ value }) =>
        createEnemyFromType(value).loot.items.some((drop) => rewardKey(drop) === key),
      )
      .map(({ value }) => value);
  expect(sources("SPELL:volt-lash")).toEqual(["thundermaw"]);
  expect(sources("ITEM:kingsfall-edge")).toEqual(["commander-kelvaris"]);
  expect(sources("SPELL:crude-strike")).toEqual([
    "skeleton-grunt",
    "fishfolk-scout",
  ]);
  expect(sources("SPELL:rootgrasp")).toEqual([]);
  expect(sources("SPELL:crushing-blow")).toEqual([]);
  expect(sources("PASSIVE:keen-instincts")).toEqual([]);
  expect(sources("ITEM:healing-potion")).toEqual(["goblin", "barkhide-shaman"]);
  expect(sources("ITEM:mana-potion")).toEqual(["fishfolk-shaman"]);
});

test("assessment updates change drop chances, while Unrated disables the default without inventing a tier", () => {
  const original = mightAssessments.spells["crude-strike"]!;
  const chance = () => defaultSpellDropRate(["crude-strike"])[0]!.dropRate;
  try {
    mightAssessments.spells["crude-strike"] = { ...original, might: 190 };
    expect(chance()).toBe(0.04);
    delete mightAssessments.spells["crude-strike"];
    expect(chance()).toBe(0);
    mightAssessments.spells["crude-strike"] = { ...original, might: 0 };
    expect(chance()).toBe(0.1);
    mightAssessments.spells["crude-strike"] = { ...original, might: -1 };
    expect(chance).toThrow("spells:crude-strike");
  } finally {
    mightAssessments.spells["crude-strike"] = original;
  }
});
