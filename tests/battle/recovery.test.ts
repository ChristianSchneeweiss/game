import { expect, test } from "bun:test";
import SuperJSON from "superjson";
import { Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { Goblin } from "../../apps/game/src/enemies/goblin";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import {
  captureStartingBuilds,
  restoreStartingBuilds,
} from "../../apps/server/src/battle/starting-builds";
import {
  castBattleSpell,
  describeBattleSpell,
} from "../../apps/server/src/battle/commands";
import { registerRecipes } from "../../apps/server/src/lib/superjson-recipes";

test("restoring frozen starting builds reproduces accepted combat despite later roster mutations", () => {
  const hero = new Character(
    "hero",
    "owner",
    "Aldric",
    "TEAM_A",
    160,
    100,
    { intelligence: 20, vitality: 16, strength: 18, agility: 25 },
    0,
    5,
    0,
  );
  hero.spells = [
    createSpellFromType("fire", "cinder-wisp"),
    createSpellFromType("hit", "basic-attack"),
  ];
  const builds = captureStartingBuilds([hero, new Goblin("goblin")]);
  const first = new BM(restoreStartingBuilds(builds), "frozen-build");
  first.start();
  hero.baseAttributes.intelligence = 999;
  hero.spells[0].config.manaCost = 999;
  hero.spells = [];
  const restored = new BM(
    restoreStartingBuilds(SuperJSON.parse(SuperJSON.stringify(builds))),
    "frozen-build",
  );
  restored.start();
  const command = {
    entityId: "hero",
    spellId: "fire",
    targetIds: ["goblin"],
    revision: first.events.length,
  };
  for (const bm of [first, restored]) castBattleSpell(bm, command, "owner");
  expect(restored.events).toEqual(first.events);
  expect(restored.getCurrentRound()).toEqual(first.getCurrentRound());
  // Internal modifier IDs use nanoid; their rule values and combat results must agree.
  const outcomes = (bm: BM) =>
    bm.entities.map((e) => [
      e.id,
      e.health,
      e.mana,
      e.attributeModifiers.map(({ attribute, operation, value }) => ({
        attribute,
        operation,
        value,
      })),
      e.spells.map((s) => s.currentCooldown),
    ]);
  expect(outcomes(restored)).toEqual(outcomes(first));
  expect(restored.rng.state!()).toEqual(first.rng.state!());
});

test("repeated description and wire serialization preserve live managers and combat randomness", () => {
  registerRecipes();
  const hero = new Character(
    "hero",
    "owner",
    "Aldric",
    "TEAM_A",
    100,
    100,
    { intelligence: 20, vitality: 16, strength: 18, agility: 25 },
    0,
    5,
    0,
  );
  hero.spells = [createSpellFromType("fire", "cinder-wisp")];
  const bm = new BM([hero, new Goblin("goblin")], "serialization");
  bm.start();
  const before = bm.rng.state!();
  for (let i = 0; i < 4; i++) {
    describeBattleSpell(bm, hero, hero.spells[0]);
    SuperJSON.stringify(bm.entities);
  }
  expect(bm.rng.state!()).toEqual(before);
  for (const entity of bm.entities) {
    expect(entity.battleManager).toBe(bm);
    for (const spell of entity.spells) expect(spell.battleManager).toBe(bm);
    for (const effect of entity.activeEffects)
      expect(effect.battleManager).toBe(bm);
  }
  expect(() =>
    castBattleSpell(
      bm,
      { entityId: "hero", spellId: "fire", targetIds: ["goblin"] },
      "owner",
    ),
  ).not.toThrow();
});
