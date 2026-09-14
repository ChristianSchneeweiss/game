import { expect, test } from "bun:test";
import {
  createEnemyLibrary,
  createItemLibrary,
  createPassiveLibrary,
  createSpellLibrary,
} from "../../../apps/game/src/library/catalog";
import { DEFAULT_LIBRARY_ATTRIBUTES } from "../../../apps/game/src/library/types";
import { EnemyTypeSchema } from "../../../apps/game/src/enemies/base/enemy-types";
import { ItemTypeSchema } from "../../../apps/game/src/items/item-types";
import { PassiveTypeSchema } from "../../../apps/game/src/passive-skills/base/passive-types";
import { SpellTypeSchema } from "../../../apps/game/src/spells/base/spell-types";
import {
  filterLibrary,
  parseLibrarySearch,
} from "../../../apps/client/src/features/library/library-search";

test("library includes every authored type and every combat-kit and drop reference resolves", () => {
  const spells = createSpellLibrary();
  const items = createItemLibrary();
  const passives = createPassiveLibrary();
  const enemies = createEnemyLibrary();
  expect(spells.map((entry) => entry.type).sort()).toEqual(
    SpellTypeSchema.options.map((option) => option.value).sort(),
  );
  expect(items.map((entry) => entry.type).sort()).toEqual(
    [...ItemTypeSchema.options].sort(),
  );
  expect(passives.map((entry) => entry.type).sort()).toEqual(
    PassiveTypeSchema.options.map((option) => option.value).sort(),
  );
  expect(enemies.map((entry) => entry.type).sort()).toEqual(
    EnemyTypeSchema.options.map((option) => option.value).sort(),
  );
  const entries = [...spells, ...items, ...passives, ...enemies];
  const keys = new Set(
    entries.map((entry) => `${entry.category}:${entry.type}`),
  );
  expect(keys.size).toBe(entries.length);
  for (const entry of entries) {
    expect(entry).toMatchObject({
      might: null,
      tier: null,
      assessmentStatus: "unrated",
      referenceId: null,
    });
    expect(entry.family.length).toBeGreaterThan(0);
    expect(entry.name.length).toBeGreaterThan(0);
    expect(entry.description.length).toBeGreaterThan(0);
    for (const reference of [...entry.related, ...(entry.drops ?? [])]) {
      expect(keys.has(`${reference.category}:${reference.type}`)).toBe(true);
    }
    for (const drop of entry.drops ?? []) {
      expect(drop.chance).toBeGreaterThanOrEqual(0);
      expect(drop.chance).toBeLessThanOrEqual(1);
    }
  }
});

test("spell preview uses current tactical targeting, unarmed damage, and deterministic attribute scaling", () => {
  const before = structuredClone(DEFAULT_LIBRARY_ATTRIBUTES);
  const baseline = createSpellLibrary();
  expect(
    baseline.find((entry) => entry.type === "basic-attack")?.directDamage,
  ).toBe(6);
  expect(
    baseline.find((entry) => entry.type === "fireball")?.directDamage,
  ).toBe(12);
  expect(
    baseline.find((entry) => entry.type === "fireball")?.targeting,
  ).toMatchObject({ aim: "tile", range: { min: 1, max: 3 } });
  expect(
    baseline.find((entry) => entry.type === "aqua-wave")?.description,
  ).toContain("covered enemies");
  expect(
    baseline.find((entry) => entry.type === "single-heal")?.directDamage,
  ).toBeUndefined();
  const stronger = createSpellLibrary({ ...before, intelligence: 100 });
  expect(
    stronger.find((entry) => entry.type === "fireball")?.directDamage,
  ).toBe(20);
  expect(
    stronger.find((entry) => entry.type === "fireball")?.description,
  ).not.toBe(baseline.find((entry) => entry.type === "fireball")?.description);
  expect(DEFAULT_LIBRARY_ATTRIBUTES).toEqual(before);
  expect(createSpellLibrary()).toEqual(baseline);
  expect(() => JSON.stringify(baseline)).not.toThrow();
});

test("equipment and enemies expose authored modifiers, kits, and exact drop chances", () => {
  const sword = createItemLibrary().find(
    (entry) => entry.type === "iron-sword",
  )!;
  expect(sword.stats).toContainEqual({ label: "Strength", value: "+6" });
  expect(sword.related).toContainEqual({
    category: "spells",
    type: "basic-attack",
  });
  const skeleton = createEnemyLibrary().find(
    (entry) => entry.type === "ashen-skeleton",
  )!;
  expect(skeleton.health).toBe(50);
  expect(skeleton.stats).toContainEqual({ label: "Health Regen", value: 2 });
  expect(skeleton.stats).toContainEqual({ label: "Mana Regen", value: 0.6 });
  expect(skeleton.stats).toContainEqual({
    label: "Critical damage bonus",
    value: "100%",
  });
  expect(skeleton.drops).toEqual([
    { category: "spells", type: "splinter-shot", chance: 1 },
  ]);
  expect(
    createPassiveLibrary().find((entry) => entry.type === "stoneform-resolve")
      ?.description,
  ).toContain("15 stacks");
});

test("search combines case-insensitive terms, tier and recipients; numeric sort handles zero and missing estimates", () => {
  const entries = createSpellLibrary();
  expect(
    filterLibrary(
      entries,
      parseLibrarySearch({
        q: " FIREBALL ",
        tier: "unrated",
        group: "enemies",
      }),
    ).map((entry) => entry.type),
  ).toEqual(["fireball"]);
  expect(
    filterLibrary(entries, parseLibrarySearch({ q: "fireball", tier: "E" })),
  ).toHaveLength(0);
  expect(
    filterLibrary(entries, parseLibrarySearch({ q: "no-such-spell" })),
  ).toHaveLength(0);
  const byMana = filterLibrary(entries, parseLibrarySearch({ sort: "mana" }));
  expect(byMana[0]?.mana).toBe(0);
  expect(byMana.map((entry) => entry.mana)).toEqual(
    entries.map((entry) => entry.mana).sort((a, b) => a! - b!),
  );
  const byDamage = filterLibrary(
    entries,
    parseLibrarySearch({ sort: "directDamage" }),
  );
  expect(byDamage.at(-1)?.directDamage).toBeUndefined();
  expect(byDamage[0]?.directDamage).toBe(
    Math.max(...entries.map((entry) => entry.directDamage ?? 0)),
  );
  expect(
    parseLibrarySearch({ category: "unknown", tier: "Z", sort: "bogus", q: 4 })
      .category,
  ).toBe("spells");
  const enemySearch = parseLibrarySearch({
    category: "enemies",
    sort: "health",
    tier: "unrated",
  });
  expect(enemySearch.tier).toBe("unrated");
  const enemies = createEnemyLibrary();
  expect(filterLibrary(enemies, enemySearch)[0]?.health).toBe(
    Math.max(...enemies.map((entry) => entry.health!)),
  );
});
