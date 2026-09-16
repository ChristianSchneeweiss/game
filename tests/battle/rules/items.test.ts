import { afterAll, expect, test } from "bun:test";
import {
  getItemDefinition,
  getItemDefinitions,
} from "../../../apps/game/src/items/catalog";
import { EquipmentTypeSchema } from "../../../apps/game/src/items/equipment-types";
import { ItemTypeSchema } from "../../../apps/game/src/items/item-types";
import { equipmentFactory } from "../../../apps/game/src/items/equipment/equipment-factory";
import {
  CONSUMABLE_DEFINITIONS,
  MATERIAL_DEFINITIONS,
} from "../../../apps/game/src/items/stackable-catalog";
import { createItemLibrary } from "../../../apps/game/src/library/catalog";
import { defaultItemDropRate } from "../../../apps/game/src/utils/loot";
import {
  filterLibrary,
  parseLibrarySearch,
} from "../../../apps/client/src/features/library/library-search";
import {
  captureStartingBuilds,
  restoreStartingBuilds,
} from "../../../apps/server/src/battle/starting-builds";
import { decodeStartingBuilds } from "../../../apps/server/src/battle/starting-build-codec";
import { contentHero } from "../support/content-expansion";
import { installItemFixtures } from "../support/item-fixtures";

const fixtures = installItemFixtures();
afterAll(fixtures.restore);

test("every kind has one canonical definition independent of a character and equipment boundaries stay narrow", () => {
  expect(getItemDefinitions()).toHaveLength(
    EquipmentTypeSchema.options.length +
      Object.keys(CONSUMABLE_DEFINITIONS).length +
      Object.keys(MATERIAL_DEFINITIONS).length,
  );
  for (const item of getItemDefinitions()) {
    expect(ItemTypeSchema.parse(item.type)).toBe(item.type);
    expect(getItemDefinition(item.type)).toEqual(item);
  }
  for (const item of [fixtures.material, fixtures.consumable]) {
    expect(EquipmentTypeSchema.safeParse(item.type).success).toBe(false);
    expect(() =>
      // @ts-expect-error Stackable identities must never compile as equipment.
      equipmentFactory(item.type, "bad-copy", { id: "holder" }),
    ).toThrow();
    expect("equipmentSlot" in item).toBe(false);
    expect("might" in item).toBe(false);
  }
  expect(() => getItemDefinition("unknown-item")).toThrow("Unknown item type");
  expect(ItemTypeSchema.safeParse("toString").success).toBe(false);
  expect(
    defaultItemDropRate([fixtures.material.type, fixtures.consumable.type]),
  ).toEqual([
    {
      type: "ITEM",
      data: { itemType: fixtures.material.type },
      dropRate: 0.02,
    },
    {
      type: "ITEM",
      data: { itemType: fixtures.consumable.type },
      dropRate: 0.04,
    },
  ]);
});

test("materials and consumables retain authored tiers without Might in queries and tier ordering", () => {
  const items = createItemLibrary();
  for (const fixture of [fixtures.material, fixtures.consumable]) {
    const item = items.find((entry) => entry.type === fixture.type)!;
    expect(item).toMatchObject({
      name: fixture.name,
      description: fixture.description,
      tier: fixture.tier,
      might: null,
      assessmentStatus: "not-applicable",
    });
    expect(
      filterLibrary(
        items,
        parseLibrarySearch({
          category: "items",
          tier: fixture.tier,
          group: fixture.kind,
        }),
      ),
    ).toEqual([item]);
    expect(
      filterLibrary(
        items,
        parseLibrarySearch({ category: "items", tier: "unrated" }),
      ).some((entry) => entry.type === fixture.type),
    ).toBe(false);
    // Old Might bounds cannot hide non-combat items in their separate tab.
    expect(
      filterLibrary(
        items,
        parseLibrarySearch({ category: "items", mightMin: 0, mightMax: 0 }),
      ).some((entry) => entry.type === fixture.type),
    ).toBe(true);
  }
  const supplies = items.filter(
    (entry) =>
      entry.type === fixtures.material.type ||
      entry.type === fixtures.consumable.type,
  );
  expect(
    filterLibrary(
      supplies,
      parseLibrarySearch({ category: "items", sort: "tier" }),
    ).map((entry) => entry.type),
  ).toEqual([fixtures.material.type, fixtures.consumable.type]);
  expect(
    supplies.find((entry) => entry.type === fixtures.consumable.type)!.stats,
  ).toContainEqual({
    label: "Use contexts",
    value: "Battle (requires equipping); Outside battle (from inventory)",
  });
});

test("malformed catalog content cannot masquerade as valid items", () => {
  const original = MATERIAL_DEFINITIONS[fixtures.material.type]!;
  try {
    MATERIAL_DEFINITIONS[fixtures.material.type] = {
      ...original,
      tier: "Z",
    } as never;
    expect(() => createItemLibrary()).toThrow();
    MATERIAL_DEFINITIONS[fixtures.material.type] = { ...original, name: "" };
    expect(ItemTypeSchema.safeParse(fixtures.material.type).success).toBe(
      false,
    );
  } finally {
    MATERIAL_DEFINITIONS[fixtures.material.type] = original;
  }
  const consumable = CONSUMABLE_DEFINITIONS[fixtures.consumable.type]!;
  try {
    CONSUMABLE_DEFINITIONS[fixtures.consumable.type] = {
      ...consumable,
      useContexts: [],
    } as never;
    expect(() => getItemDefinition(fixtures.consumable.type)).toThrow();
    CONSUMABLE_DEFINITIONS["iron-sword"] = consumable;
    expect(() => getItemDefinition("iron-sword")).toThrow(
      "Duplicate item definition",
    );
  } finally {
    CONSUMABLE_DEFINITIONS[fixtures.consumable.type] = consumable;
    delete CONSUMABLE_DEFINITIONS["iron-sword"];
  }
});

test("saved equipment decoding rejects stackables and preserves historical attributes and copy identities", () => {
  const hero = contentHero([], ["int-armor", "iron-sword"]);
  const builds = captureStartingBuilds([hero]);
  const restored = restoreStartingBuilds(decodeStartingBuilds(builds))[0]!;
  expect(restored.equipped.ARMOR?.id).toBe(hero.equipped.ARMOR?.id);
  expect(restored.equipped.ARMOR?.modifiers).toEqual(
    hero.equipped.ARMOR?.modifiers,
  );
  for (const type of [fixtures.material.type, fixtures.consumable.type]) {
    const malformed = structuredClone(builds);
    Object.assign(malformed[0]!.equipment[0]!, { type });
    expect(() => decodeStartingBuilds(malformed)).toThrow(
      "Invalid saved battle starting builds",
    );
  }
});
