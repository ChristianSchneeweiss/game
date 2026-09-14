import { expect, test } from "bun:test";
import { Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../../apps/game/src/spells/base/spell-types";
import { planEnemyTurn } from "../../../apps/game/src/tactical/ai";
import { enemyThreat } from "../../../apps/game/src/tactical/threat";
import { SPELL_TARGETING } from "../../../apps/game/src/tactical/catalogue";
import { createEnemyFromType } from "../../../apps/server/src/game-usecases/enemy-factory";
import { combatState } from "../support/invariants";

function fixture(spells: SpellType[] = ["basic-attack"]) {
  const hero = new Character(
    "hero",
    "owner",
    "Hero",
    "TEAM_A",
    500,
    100,
    { strength: 25, intelligence: 40, agility: 100, vitality: 10 },
    0,
    1,
    0,
  );
  hero.spells = spells.map((type) => createSpellFromType(type, type));
  const enemy = createEnemyFromType("goblin", "enemy");
  const bm = new BM([hero, enemy], "ai-readonly", {
    rulesVersion: 2,
    battlefield: { width: 11, height: 9, blocked: [], layoutVersion: "ai-v1" },
    positions: { hero: { x: 0, y: 8 }, enemy: { x: 10, y: 0 } },
  });
  bm.start();
  bm.preTurn();
  return { bm, hero, enemy };
}

test("AI approaches a future attack position on a large board using its three-step budget", () => {
  const { bm } = fixture();
  const before = combatState(bm);
  expect(planEnemyTurn(bm)).toEqual({ destination: { x: 0, y: 5 } });
  expect(planEnemyTurn(bm)).toEqual({ destination: { x: 0, y: 5 } });
  expect(combatState(bm)).toEqual(before);
});

test("AI passes when all paths are blocked or it has no affordable spell", () => {
  const { bm, hero } = fixture();
  bm.grid!.battlefield.blocked = [
    { x: 0, y: 7 },
    { x: 1, y: 8 },
  ];
  expect(planEnemyTurn(bm)).toEqual({});
  bm.grid!.battlefield.blocked = [];
  hero.spells = [createSpellFromType("fireball", "fireball")];
  hero.spells[0]!.config.targeting = SPELL_TARGETING.fireball;
  hero.mana = 0;
  expect(planEnemyTurn(bm)).toEqual({});
});

test("AI prefers useful damage against armor, and previews cannot draw combat randomness", () => {
  const { bm, enemy } = fixture(["precise-thrust", "fireball", "basic-attack"]);
  bm.grid!.positions.enemy = { x: 0, y: 7 };
  enemy.baseSpecialAttributes.armor = 100;
  enemy.baseSpecialAttributes.magicResistance = 0;
  const before = combatState(bm);
  const plan = planEnemyTurn(bm);
  expect(plan.spellId).toBe("fireball");
  expect(plan.destination).toBeUndefined();
  const threat = enemyThreat(bm.grid!, bm.entities, enemy.id, 3, [
    SPELL_TARGETING.fireball,
  ]);
  expect(threat.movementTiles.length).toBeGreaterThan(1);
  expect(threat.attackTiles.length).toBeGreaterThan(
    threat.movementTiles.length,
  );
  expect(combatState(bm)).toEqual(before);
});
