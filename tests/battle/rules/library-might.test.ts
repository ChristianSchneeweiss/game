import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  createEnemyLibrary,
  createItemLibrary,
  createPassiveLibrary,
  createSpellLibrary,
} from "../../../apps/game/src/library/catalog";
import {
  DEFAULT_LIBRARY_ATTRIBUTES,
  type LibraryEntry,
} from "../../../apps/game/src/library/types";
import { mightAssessments } from "../../../apps/game/src/might/assessments";
import { assessMight } from "../../../apps/game/src/might/might";
import {
  filterLibrary,
  parseLibrarySearch,
} from "../../../apps/client/src/features/library/library-search";
import {
  fixtureAssessment,
  installLibraryAssessments,
} from "../support/library-fixtures";

let restore: () => void;
beforeEach(() => {
  restore = installLibraryAssessments();
});
afterEach(() => restore());

test("authored metadata projects through all four catalogues with a family even when Unrated", () => {
  const entries = [
    ...createSpellLibrary(),
    ...createItemLibrary(),
    ...createPassiveLibrary(),
    ...createEnemyLibrary(),
  ];
  for (const [category, type, might, tier, family, assessmentStatus] of [
    ["spells", "fireball", 190, "C", "spells", "assessed"],
    ["items", "iron-sword", 190, "C", "items:weapon", "assessed"],
    ["passives", "armor-up", 138, "D", "passives", "estimated"],
    ["enemies", "ashen-skeleton", 263, "B", "enemies", "assessed"],
    ["items", "oakwarden-staff", null, null, "items:weapon", "unrated"],
  ])
    expect(
      entries.find(
        (entry) => entry.category === category && entry.type === type,
      ),
    ).toMatchObject({ might, tier, family, assessmentStatus });
  expect(entries.find((entry) => entry.type === "fireball")?.legacyTier).toBe(
    "A",
  );
  expect(
    new Set(entries.map((entry) => `${entry.category}:${entry.type}`)).size,
  ).toBe(entries.length);
  for (const entry of entries) {
    for (const ref of [...entry.related, ...(entry.drops ?? [])]) {
      expect(
        entries.find(
          (related) =>
            related.category === ref.category && related.type === ref.type,
        ),
      ).toBeDefined();
    }
  }
  expect(JSON.stringify(entries)).toBe(
    JSON.stringify([
      ...createSpellLibrary(),
      ...createItemLibrary(),
      ...createPassiveLibrary(),
      ...createEnemyLibrary(),
    ]),
  );
});

test("changing assessment promotes and demotes the projected tier and tier-filter membership", () => {
  for (const [might, tier] of [
    [189, "D"],
    [190, "C"],
    [189, "D"],
  ] as const) {
    mightAssessments.spells.fireball = fixtureAssessment(might);
    const spells = createSpellLibrary();
    expect(spells.find((entry) => entry.type === "fireball")).toMatchObject({
      might,
      tier,
      legacyTier: "A",
    });
    expect(
      filterLibrary(spells, parseLibrarySearch({ tier, q: "fireball" })),
    ).toHaveLength(1);
    expect(
      filterLibrary(
        spells,
        parseLibrarySearch({ tier: tier === "C" ? "D" : "C", q: "fireball" }),
      ),
    ).toHaveLength(0);
  }
});

test("preview attributes change damage without changing authored valuation or evidence", () => {
  const before = createSpellLibrary();
  const after = createSpellLibrary({
    ...DEFAULT_LIBRARY_ATTRIBUTES,
    intelligence: 100,
  });
  expect(
    after.find((entry) => entry.type === "fireball")?.directDamage,
  ).not.toBe(before.find((entry) => entry.type === "fireball")?.directDamage);
  const ratings = (entries: LibraryEntry[]) =>
    entries.map(
      ({ type, might, tier, family, assessmentStatus, referenceId }) => ({
        type,
        might,
        tier,
        family,
        assessmentStatus,
        referenceId,
      }),
    );
  expect(ratings(after)).toEqual(ratings(before));
});

test("invalid authored evidence fails at the catalogue boundary and identifies the content", () => {
  mightAssessments.items["iron-sword"] = {
    ...fixtureAssessment(190),
    rationale: "",
  };
  expect(createItemLibrary).toThrow("items:iron-sword");
  mightAssessments.enemies.goblin = fixtureAssessment(-1);
  expect(createEnemyLibrary).toThrow("enemies:goblin");
});

test("Might sorts zero, Estimated values, deterministic ties and missing values in both directions", () => {
  const base = createSpellLibrary()[0];
  const make = (type: string, name: string, might?: number): LibraryEntry => ({
    ...base,
    type,
    name,
    ...assessMight(
      `spells:${type}`,
      might === undefined ? undefined : fixtureAssessment(might, "estimated"),
    ),
  });
  const entries = [
    make("z-unknown", "A unknown"),
    make("b", "Equal", 190),
    make("a", "Equal", 190),
    make("zero", "Zero", 0),
    make("low", "Low", 189),
    make("a-unknown", "A unknown"),
  ];
  const types = (sort: string) =>
    filterLibrary(entries, parseLibrarySearch({ sort })).map(
      (entry) => entry.type,
    );
  expect(types("mightAsc")).toEqual([
    "zero",
    "low",
    "a",
    "b",
    "a-unknown",
    "z-unknown",
  ]);
  expect(types("mightDesc")).toEqual([
    "a",
    "b",
    "low",
    "zero",
    "a-unknown",
    "z-unknown",
  ]);
  expect(types("tier")).toEqual([
    "a",
    "b",
    "low",
    "zero",
    "a-unknown",
    "z-unknown",
  ]);
});

test("Might bounds are inclusive, independent and conjunctive with existing filters", () => {
  const entries = createSpellLibrary();
  const find = (search: Record<string, unknown>) =>
    filterLibrary(entries, parseLibrarySearch(search)).map(
      (entry) => entry.type,
    );
  expect(find({ mightMin: 189, mightMax: 190, sort: "mightAsc" })).toEqual([
    "single-heal",
    "fireball",
  ]);
  expect(find({ mightMin: 190 })).toEqual(["fireball"]);
  expect(find({ mightMax: 0 })).toEqual(["basic-attack"]);
  expect(
    find({
      mightMin: 190,
      mightMax: 190,
      q: " FIREBALL ",
      tier: "C",
      group: "enemies",
    }),
  ).toEqual(["fireball"]);
  expect(find({ mightMin: 190, group: "allies" })).toEqual([]);
  expect(find({ tier: "unrated" })).not.toContain("basic-attack");
  expect(find({ tier: "unrated", mightMin: 0 })).toEqual([]);
  expect(find({ tier: "unrated" }).length).toBe(entries.length - 3);
});

test("item Might ordering keeps alphabetic slot families and Unrated last in each", () => {
  const entries = createItemLibrary();
  for (const sort of ["mightAsc", "mightDesc"]) {
    const all = filterLibrary(
      entries,
      parseLibrarySearch({ category: "items", sort, group: "unknown" }),
    );
    expect(all.map((entry) => entry.type)).toEqual([
      "iron-cuirass",
      "int-armor",
      "iron-sword",
      "oakwarden-staff",
    ]);
    expect(all.map((entry) => entry.family)).toEqual([
      "items:armor",
      "items:armor",
      "items:weapon",
      "items:weapon",
    ]);
    expect(
      filterLibrary(
        entries,
        parseLibrarySearch({
          category: "items",
          sort,
          mightMin: 190,
          mightMax: 500,
        }),
      ).map((entry) => entry.type),
    ).toEqual(["iron-cuirass", "iron-sword"]);
  }
  expect(
    filterLibrary(
      entries,
      parseLibrarySearch({
        category: "items",
        group: "weapon",
        sort: "mightDesc",
      }),
    ),
  ).toHaveLength(2);
  expect(
    filterLibrary(entries, {
      ...parseLibrarySearch({ category: "items", sort: "mightDesc" }),
      group: "bogus",
    }),
  ).toHaveLength(entries.length);
});

test("URL validation discards malformed and reversed ranges and keeps supported old links", () => {
  for (const value of [
    "-1",
    "1.5",
    "NaN",
    "Infinity",
    "1e2",
    "0x10",
    " ",
    " 12",
    "",
    [],
    {},
    true,
    -1,
    1.1,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    expect(
      parseLibrarySearch({ mightMin: value, mightMax: 190 }),
    ).toMatchObject({ mightMin: undefined, mightMax: 190 });
    expect(parseLibrarySearch({ mightMin: 0, mightMax: value })).toMatchObject({
      mightMin: 0,
      mightMax: undefined,
    });
  }
  expect(
    parseLibrarySearch({ mightMin: "191", mightMax: "190" }),
  ).toMatchObject({ mightMin: undefined, mightMax: undefined });
  const parsed = parseLibrarySearch({
    category: "items",
    sort: "mightDesc",
    mightMin: "0",
    mightMax: "190",
    group: "weapon",
    entry: "iron-sword",
  });
  const url = new URL("http://localhost/library");
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  expect(parseLibrarySearch(Object.fromEntries(url.searchParams))).toEqual(
    parsed,
  );
  for (const category of ["spells", "items", "passives", "enemies"]) {
    expect(parseLibrarySearch({ category, group: "invalid" }).group).toBe(
      "all",
    );
    expect(parseLibrarySearch({ category, sort: "mightAsc" }).sort).toBe(
      "mightAsc",
    );
    expect(parseLibrarySearch({ category })).toMatchObject({
      mightMin: undefined,
      mightMax: undefined,
    });
  }
  expect(
    parseLibrarySearch({ category: "items", group: "enemies", sort: "mana" }),
  ).toMatchObject({ group: "all", sort: "tier" });
  expect(
    parseLibrarySearch({ category: "enemies", tier: "B", sort: "tier" }).tier,
  ).toBe("B");
  expect(
    parseLibrarySearch({
      q: "fireball",
      sort: "directDamage",
      entry: "fireball",
    }),
  ).toMatchObject({
    q: "fireball",
    sort: "directDamage",
    entry: "fireball",
    mightMin: undefined,
    mightMax: undefined,
  });
});
