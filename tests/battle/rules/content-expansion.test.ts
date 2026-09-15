import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { BM } from "../../../apps/game/src/bm";
import { equipmentBuildPreview } from "../../../apps/game/src/items/equipment/build-preview";
import {
  createEnemyLibrary,
  createItemLibrary,
  createPassiveLibrary,
} from "../../../apps/game/src/library/catalog";
import { weaponProfileFor } from "../../../apps/game/src/tactical/catalogue";
import {
  skillIconUrl,
  skillName,
} from "../../../apps/client/src/lib/skill-icons";
import {
  contentBattle,
  contentHero,
  newItems,
  newPassives,
} from "../support/content-expansion";

test("all new content has an obtainable drop, a description, an assessment, and usable icons", () => {
  const entries = [...createItemLibrary(), ...createPassiveLibrary()];
  const enemies = createEnemyLibrary();
  for (const type of [...newItems, ...newPassives]) {
    const entry = entries.find((entry) => entry.type === type)!;
    expect(entry).toBeDefined();
    expect(entry.description.length).toBeGreaterThan(20);
    expect(entry.might).toBeGreaterThan(0);
    expect(entry.assessmentStatus).toBe("estimated");
    expect(
      enemies.some((enemy) =>
        enemy.drops?.some(
          (drop) =>
            drop.category === entry.category &&
            drop.type === type &&
            drop.chance > 0,
        ),
      ),
    ).toBe(true);
  }
  for (const type of newPassives) {
    expect(skillName(type)).not.toBe("Unknown skill");
    expect(
      existsSync(
        new URL(
          `../../../apps/client/public${skillIconUrl(type)}`,
          import.meta.url,
        ),
      ),
    ).toBe(true);
  }
});

for (const type of newItems) {
  test(`${type}: equipment preview and combat apply identical bonuses without mutating the catalogue`, () => {
    const hero = contentHero([], [type]);
    const preview = equipmentBuildPreview(hero);
    const item = Object.values(hero.equipped)[0]!;
    const original = structuredClone(item.modifiers);
    expect(hero.attributeModifiers).toEqual([]);
    new BM([hero], "equipment-content");
    for (const attribute of [
      ...item.modifiers.map((modifier) => modifier.attribute),
      "manaRegen" as const,
    ]) {
      expect(hero.getAttribute(attribute)).toBeCloseTo(
        preview.getAttribute(attribute),
      );
    }
    expect(item.modifiers).toEqual(original);
    item.modifiers[0]!.value = 999;
    expect(
      Object.values(contentHero([], [type]).equipped)[0]!.modifiers,
    ).toEqual(original);
  });
}

for (const type of [
  "ashen-falchion",
  "tideglass-staff",
  "stormfang-blade",
  "hollow-scepter",
] as const) {
  test(`${type}: Basic Attack uses its actual range, damage type, and captured profile`, () => {
    const { hero, enemy, bm } = contentBattle([], [type]);
    const ranged = type === "tideglass-staff" || type === "hollow-scepter";
    enemy.baseSpecialAttributes[ranged ? "armor" : "magicResistance"] = 1000;
    expect(hero.weaponAttackProfile).toEqual(weaponProfileFor(type));
    expect(hero.weaponAttackProfile).not.toBe(weaponProfileFor(type));
    const selection = { aim: "tile", tile: { x: 4, y: 1 } } as const;
    if (!ranged) {
      expect(bm.safeCastSpatial(hero.id, "hero-attack", selection)).toBeNull();
      expect(bm.moveEntity(hero.id, { x: 3, y: 1 })).toBe(true);
    }
    expect(
      bm.safeCastSpatial(hero.id, "hero-attack", selection),
    ).not.toBeNull();
    expect(enemy.health).toBeLessThan(enemy.maxHealth);
    expect(hero.mana).toBe(hero.maxMana);
    const entry = createItemLibrary().find((entry) => entry.type === type)!;
    expect(entry.targeting).toEqual(hero.weaponAttackProfile!.targeting);
    expect(entry.related).toContainEqual({
      category: "spells",
      type: "basic-attack",
    });
  });
}

test("Stormfang's Basic Attack benefits from agility independently of strength", () => {
  const { hero, enemy, spell } = contentBattle([], ["stormfang-blade"]);
  const before = spell.estimateDamage!(hero, enemy)!;
  hero.baseAttributes.agility += 20;
  expect(spell.estimateDamage!(hero, enemy)).toBeGreaterThan(before);
});

test("Predator's Focus enables critical hits from zero and combines with Keen Instincts and gear", () => {
  expect(
    contentBattle(["predators-focus"]).hero.getAttribute("critChance"),
  ).toBeCloseTo(0.1);
  for (const passives of [
    ["predators-focus", "keen-instincts"],
    ["keen-instincts", "predators-focus"],
  ] as const) {
    const { hero } = contentBattle([...passives], ["stormfang-blade"]);
    expect(hero.getAttribute("critChance")).toBeCloseTo(0.225);
    expect(hero.getAttribute("critDamage")).toBeCloseTo(1.5);
  }
});

test("Fleet Footed adds usable movement and offsets heavy armor's penalty", () => {
  for (const [armor, allowance] of [
    ["stormrunner-leathers", 5],
    ["gravewarden-plate", 3],
  ] as const) {
    const { hero, bm } = contentBattle(["fleet-footed"], [armor]);
    expect(bm.grid!.activation!.allowance).toBe(allowance);
    expect(bm.moveEntity(hero.id, { x: 1 + allowance, y: 2 })).toBe(false);
    expect(bm.moveEntity(hero.id, { x: allowance, y: 2 })).toBe(true);
    expect(bm.grid!.activation!.spent).toBe(allowance);
  }
});

test("Arcane Barrier reduces magical damage after resistance, including periodic hits, and leaves physical damage alone", () => {
  const { hero, enemy, bm, spell } = contentBattle(["arcane-barrier"]);
  hero.baseSpecialAttributes.magicResistance = 20;
  for (const cause of ["direct", "periodic", "reflection"] as const) {
    expect(
      bm.handler.damage(spell, 120, "MAGICAL", enemy, hero, { cause })
        .totalDamage,
    ).toBe(85);
  }
  expect(
    bm.handler.damage(spell, 100, "PHYSICAL", enemy, hero).totalDamage,
  ).toBe(100);
  expect(bm.handler.damage(spell, 10, "MAGICAL", enemy, hero).totalDamage).toBe(
    0,
  );
});

test("Last Bastion checks health before each hit, stacks with Arcane Barrier, and stops after recovery", () => {
  const { hero, enemy, bm, spell } = contentBattle([
    "last-bastion",
    "arcane-barrier",
  ]);
  hero.health = 351;
  expect(
    bm.handler.damage(spell, 100, "PHYSICAL", enemy, hero).totalDamage,
  ).toBe(100);
  hero.health = 350;
  expect(
    bm.handler.damage(spell, 100, "PHYSICAL", enemy, hero).totalDamage,
  ).toBe(80);
  expect(
    bm.handler.damage(spell, 100, "MAGICAL", enemy, hero).totalDamage,
  ).toBe(68);
  bm.handler.healing(spell, 500, hero, hero);
  expect(
    bm.handler.damage(spell, 100, "PHYSICAL", enemy, hero).totalDamage,
  ).toBe(100);
});

test("Merciful Light boosts wounded recipients and lifesteal without reviving dead targets", () => {
  const { hero, enemy, bm, spell } = contentBattle([
    "merciful-light",
    "bloodfang",
  ]);
  hero.health = 500;
  expect(
    bm.handler.healing(spell, 100, hero, hero).healingApplied?.get(hero.id),
  ).toBe(125);
  expect(
    bm.handler.healing(spell, 100, hero, hero).healingApplied?.get(hero.id),
  ).toBe(100);
  hero.health = 300;
  bm.handler.damage(spell, 200, "PHYSICAL", hero, enemy);
  expect(hero.health).toBe(325);
  enemy.team = hero.team;
  enemy.health = 500;
  expect(
    bm.handler.healing(spell, 100, hero, enemy).healingApplied?.get(enemy.id),
  ).toBe(125);
  enemy.health = 0;
  bm.handler.healing(spell, 100, hero, enemy);
  expect(enemy.health).toBe(0);
});

test("Executioner boosts finishing hits before defenses, excluding periodic, reflection, and allies", () => {
  const { hero, enemy, bm, spell } = contentBattle(["executioner"]);
  enemy.baseSpecialAttributes.armor = 20;
  enemy.health = 351;
  expect(
    bm.handler.damage(spell, 100, "PHYSICAL", hero, enemy).totalDamage,
  ).toBe(80);
  enemy.health = 350;
  expect(
    bm.handler.damage(spell, 100, "PHYSICAL", hero, enemy).totalDamage,
  ).toBe(100);
  for (const cause of ["periodic", "reflection"] as const) {
    enemy.health = 350;
    expect(
      bm.handler.damage(spell, 100, "PHYSICAL", hero, enemy, { cause })
        .totalDamage,
    ).toBe(80);
  }
  enemy.team = hero.team;
  enemy.health = 350;
  expect(
    bm.handler.damage(spell, 100, "PHYSICAL", hero, enemy).totalDamage,
  ).toBe(80);
});
