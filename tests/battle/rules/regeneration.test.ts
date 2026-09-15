import { expect, test } from "bun:test";
import { BaseEntity, Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { passiveSkillFactory } from "../../../apps/game/src/passive-skills/base/passive-skill.factory";
import { getCharacterSpecialAttributes } from "../../../apps/client/src/lib/character-stats";

function hero(vitality = 40) {
  return new Character(
    "hero",
    "owner",
    "Hero",
    "TEAM_A",
    200,
    100,
    { strength: 10, intelligence: 40, vitality, agility: 30 },
    0,
    1,
    0,
  );
}

for (const [vitality, stat, applied] of [
  [0, 0, 0],
  [10, 3.75, 4],
  [40, 15, 15],
  [80, 30, 30],
]) {
  test(`Vitality ${vitality} provides ${stat} health regeneration, applying ${applied} after rounding`, () => {
    const character = hero(vitality);
    character.health = 50;
    expect(character.getAttribute("healthRegen")).toBe(stat);
    character.onUpkeep();
    expect(character.health).toBe(50 + applied);
  });
}

test("regeneration retains base bonuses and Vital Wellspring after the scaling reduction", () => {
  const character = hero();
  character.baseSpecialAttributes.healthRegen = 4;
  character.attributeModifiers.push({
    id: "vitality",
    attribute: "vitality",
    operation: "ADD",
    value: 8,
  });
  character.passiveSkills = [
    passiveSkillFactory("vital-wellspring", "wellspring", character),
  ];
  new BM([character], "regeneration-passive", {
    rulesVersion: 2,
    battlefield: { width: 5, height: 5, blocked: [], layoutVersion: "test-v1" },
    positions: { hero: { x: 0, y: 0 } },
  });
  expect(character.getAttribute("healthRegen")).toBe(27.5);
  character.health = 50;
  character.onUpkeep();
  expect(character.health).toBe(78);
  expect(character.getAttribute("manaRegen")).toBe(8);
});

test("enemy regeneration stays at two, and upkeep respects health caps and death", () => {
  const enemy = new BaseEntity("enemy", "Enemy", "TEAM_B", 200, 100, {
    strength: 10,
    intelligence: 40,
    vitality: 80,
    agility: 10,
  });
  expect(enemy.getAttribute("healthRegen")).toBe(2);
  const character = hero();
  character.health = 198;
  character.onUpkeep();
  expect(character.health).toBe(200);
  character.health = 0;
  expect(character.onUpkeep()).toBeNull();
  expect(character.health).toBe(0);
});

test("a tactical activation applies the reduced regeneration once", () => {
  const character = hero();
  character.health = 50;
  character.mana = 20;
  const enemy = new BaseEntity("enemy", "Enemy", "TEAM_B", 200, 100, {
    strength: 10,
    intelligence: 10,
    vitality: 10,
    agility: 10,
  });
  const battle = new BM([character, enemy], "regeneration-balance", {
    rulesVersion: 2,
    battlefield: { width: 5, height: 5, blocked: [], layoutVersion: "test-v1" },
    positions: { hero: { x: 0, y: 0 }, enemy: { x: 4, y: 4 } },
  });
  battle.start();
  battle.preTurn();
  expect(character.health).toBe(65);
  expect(character.mana).toBe(28);
  expect(battle.moveEntity(character.id, { x: 1, y: 0 })).toBe(true);
  battle.preTurn();
  expect(character.health).toBe(65);
  expect(
    battle.events.filter(
      ({ event }) =>
        event.eventType === "REGEN" && event.data.entityId === character.id,
    ),
  ).toHaveLength(1);
});

test("the serialized character sheet uses the same reduced scaling", () => {
  const character = JSON.parse(JSON.stringify(hero())) as Character;
  const before = JSON.stringify(character);
  const stats = getCharacterSpecialAttributes(character);
  expect(stats.healthRegen).toBe(15);
  expect(stats.manaRegen).toBe(8);
  expect(JSON.stringify(character)).toBe(before);
});

test("legacy v1 battles retain their original regeneration rule", () => {
  const character = hero();
  character.health = 50;
  new BM([character], "legacy-regeneration");
  expect(character.getAttribute("healthRegen")).toBe(20);
  character.onUpkeep();
  expect(character.health).toBe(70);
});
