import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { BM } from "../../../apps/game/src/bm";
import { ItemTypeSchema } from "../../../apps/game/src/items/item-types";
import { itemFactory } from "../../../apps/game/src/items/equipment/item-factory";
import { equipmentBuildPreview } from "../../../apps/game/src/items/equipment/build-preview";
import { EQUIPMENT_SLOTS } from "../../../apps/game/src/items/equipment/equipment-slots";
import {
  TIERED_EQUIPMENT,
  tieredEquipmentTypes,
} from "../../../apps/game/src/items/equipment/tiered-equipment";
import {
  createItemLibrary,
  createEnemyLibrary,
} from "../../../apps/game/src/library/catalog";
import { weaponProfileFor } from "../../../apps/game/src/tactical/catalogue";
import { contentBattle, contentHero } from "../support/content-expansion";

test("all nine slots span E–S, with obtainable sources and one consistent tier for every new item", () => {
  const items = createItemLibrary();
  const enemies = createEnemyLibrary();
  const assessments = readFileSync(
    new URL("../../../docs/might/assessments.md", import.meta.url),
    "utf8",
  );
  expect(tieredEquipmentTypes).toHaveLength(49);
  expect(ItemTypeSchema.options).toHaveLength(61);
  for (const slot of EQUIPMENT_SLOTS) {
    const entries = items.filter((entry) => entry.group === slot.toLowerCase());
    expect([...new Set(entries.map((item) => item.tier))].sort()).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "S",
    ]);
    if (slot !== "WEAPON" && slot !== "ARMOR") expect(entries).toHaveLength(6);
  }
  for (const type of tieredEquipmentTypes) {
    const entry = items.find((item) => item.type === type)!;
    const item = itemFactory(type, `test-${type}`, contentHero());
    expect(entry.tier).toBe(item.tier);
    expect(item.modifiers.length).toBeGreaterThan(0);
    expect(entry.assessmentStatus).toBe("estimated");
    const heading = entry.referenceId!.split("#")[1]!.replaceAll("-", " ");
    expect(assessments.toLowerCase()).toContain(`## ${heading}`);
    const source = enemies.find(
      (enemy) => enemy.type === TIERED_EQUIPMENT[type].source,
    )!;
    expect(
      source.drops?.some(
        (drop) => drop.type === type && drop.chance > 0 && drop.chance <= 1,
      ),
    ).toBe(true);
  }
});

test("nine equipped pieces stack with passives, and ring replacement previews leave the original build intact", () => {
  const types = tieredEquipmentTypes.filter(
    (type) => TIERED_EQUIPMENT[type].tier === "S",
  );
  const { hero } = contentBattle(["keen-instincts", "armor-up"], types);
  expect(Object.keys(hero.equipped)).toHaveLength(9);
  expect(hero.getAttribute("strength")).toBe(72);
  expect(hero.getAttribute("intelligence")).toBe(44);
  expect(hero.getAttribute("vitality")).toBe(66);
  expect(hero.getAttribute("agility")).toBe(58);
  expect(hero.getAttribute("armor")).toBe(84);
  expect(hero.getAttribute("magicResistance")).toBe(76);
  expect(hero.getAttribute("movement")).toBe(5);
  expect(hero.getAttribute("critChance")).toBeCloseTo(0.25);
  expect(hero.getAttribute("lifesteal")).toBeCloseTo(0.08);
  expect(hero.getAttribute("healthRegen")).toBeCloseTo(33.75);
  const before = equipmentBuildPreview(hero);
  const ring = itemFactory("copper-band", "replacement", hero);
  const preview = equipmentBuildPreview(hero, { ...hero.equipped, RING: ring });
  expect(preview.getAttribute("strength")).toBe(
    before.getAttribute("strength") - 9,
  );
  expect(preview.getAttribute("critChance")).toBeCloseTo(0.12);
  expect(hero.equipped.RING?.itemType).toBe("sovereign-signet");
  expect(hero.getAttribute("critChance")).toBeCloseTo(0.25);
  for (const slot of EQUIPMENT_SLOTS.filter((slot) => slot !== "RING"))
    expect(preview.equipped[slot]).toBe(hero.equipped[slot]);
  expect(hero.maxHealth).toBe(1000);
  expect(hero.maxMana).toBe(1000);
});

for (const type of [
  "sunforged-greatsword",
  "starfall-staff",
  "kingsfall-edge",
] as const) {
  test(`${type} uses its own captured profile for a real Basic Attack`, () => {
    const { hero, enemy, bm } = contentBattle([], [type]);
    expect(hero.weaponAttackProfile).toEqual(weaponProfileFor(type));
    expect(hero.weaponAttackProfile).not.toBe(weaponProfileFor(type));
    if (type !== "starfall-staff") {
      expect(
        bm.safeCastSpatial(hero.id, "hero-attack", {
          aim: "tile",
          tile: { x: 4, y: 1 },
        }),
      ).toBeNull();
      expect(bm.moveEntity(hero.id, { x: 3, y: 1 })).toBe(true);
    }
    expect(
      bm.safeCastSpatial(hero.id, "hero-attack", {
        aim: "tile",
        tile: { x: 4, y: 1 },
      }),
    ).not.toBeNull();
    expect(enemy.health).toBeLessThan(enemy.maxHealth);
  });
}

test("Starfall can hit at four tiles and equipment percentages remain readable in the Library", () => {
  const hero = contentHero([], ["starfall-staff"]);
  const enemy = contentHero();
  enemy.id = "enemy";
  enemy.team = "TEAM_B";
  const bm = new BM([hero, enemy], "starfall-range", {
    rulesVersion: 2,
    battlefield: { width: 8, height: 5, blocked: [], layoutVersion: "test" },
    positions: { hero: { x: 1, y: 1 }, enemy: { x: 5, y: 1 } },
  });
  bm.start();
  bm.preTurn();
  expect(
    bm.safeCastSpatial(hero.id, "hero-attack", {
      aim: "tile",
      tile: { x: 5, y: 1 },
    }),
  ).not.toBeNull();
  const ring = createItemLibrary().find(
    (item) => item.type === "sovereign-signet",
  )!;
  expect(ring.stats).toContainEqual({ label: "Crit Chance", value: "+8%" });
});
