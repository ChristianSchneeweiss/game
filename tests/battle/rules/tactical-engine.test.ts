import { describe, expect, test } from "bun:test";
import { Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { StunEffect } from "../../../apps/game/src/effect/stun.effect";
import { MindControlEffect } from "../../../apps/game/src/effect/mind-control.effect";
import { itemFactory } from "../../../apps/game/src/items/equipment/item-factory";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import { SpellTypeSchema, type SpellType } from "../../../apps/game/src/spells/base/spell-types";
import { legalSelections, queryCast, reachableTiles } from "../../../apps/game/src/tactical/queries";
import type { GridSetup, Tile, WeaponAttackProfile } from "../../../apps/game/src/tactical/types";

function actor(id: string, team: "TEAM_A" | "TEAM_B", types: SpellType[] = ["basic-attack"]) {
  const entity = new Character(id, "owner", id, team, 500, 500,
    { strength: 20, intelligence: 20, vitality: 20, agility: team === "TEAM_A" ? 30 : 10 }, 0, 1, 0);
  entity.spells = types.map(type => createSpellFromType(`${id}-${type}`, type));
  return entity;
}

function battle(actors: Character[], positions: Record<string, Tile>, blocked: Tile[] = [], seed = "grid-engine") {
  const setup: GridSetup = {
    rulesVersion: 2, battlefield: { width: 11, height: 9, blocked, layoutVersion: "test-v1" }, positions,
  };
  const bm = new BM(actors, seed, setup);
  bm.start();
  bm.preTurn();
  return bm;
}

function pass(bm: BM) {
  expect(bm.passTurn(bm.grid!.activation!.entityId)).toBe(true);
  bm.postTurn();
  bm.preTurn();
}

describe("tactical engine activations", () => {
  test("several moves share allowance and do not repeat upkeep or advance combat clocks", () => {
    const hero = actor("hero", "TEAM_A");
    const enemy = actor("enemy", "TEAM_B");
    hero.health = hero.mana = 50;
    const bm = battle([hero, enemy], { hero: { x: 1, y: 1 }, enemy: { x: 5, y: 5 } }, [{ x: 2, y: 1 }]);
    hero.spells[0]!.currentCooldown = 2;
    const resources = [hero.health, hero.mana];
    const activationId = bm.grid!.activation!.id;
    expect(bm.moveEntity(hero.id, { x: 3, y: 1 })).toBe(false);
    expect(bm.moveEntity(hero.id, { x: 2, y: 2 })).toBe(true);
    expect(bm.moveEntity(hero.id, { x: 3, y: 2 })).toBe(true);
    expect(bm.moveEntity(hero.id, { x: 3, y: 1 })).toBe(false);
    bm.preTurn();
    expect(bm.grid!.activation).toEqual({ id: activationId, entityId: hero.id, allowance: 3, spent: 3 });
    expect([hero.health, hero.mana]).toEqual(resources);
    expect(hero.spells[0]!.currentCooldown).toBe(2);
    expect(bm.getCurrentRound().orderQueue[0]).toBe(hero.id);
    expect(bm.revision).toBe(2);
    const moves = bm.events.flatMap(({ event }) => event.eventType === "MOVE" ? [event.data] : []);
    expect(moves[0]!.path).toEqual([{ x: 1, y: 2 }, { x: 2, y: 2 }]);
    expect(moves[1]!.movementRemaining).toBe(0);
  });

  test("Movement modifiers are floored and independent from Agility", () => {
    const hero = actor("hero", "TEAM_A");
    hero.attributeModifiers = [
      { id: "movement", attribute: "movement", operation: "ADD", value: 1.9 },
      { id: "agility", attribute: "agility", operation: "ADD", value: -5 },
    ];
    const bm = battle([hero, actor("enemy", "TEAM_B")], { hero: { x: 1, y: 1 }, enemy: { x: 7, y: 7 } });
    expect(hero.getAttribute("agility")).toBe(25);
    expect(bm.grid!.activation!.allowance).toBe(4);
    expect(bm.moveEntity(hero.id, { x: 5, y: 1 })).toBe(true);
  });

  test("invalid commands preserve resources, activation, events, and combat randomness", () => {
    const hero = actor("hero", "TEAM_A", ["fireball"]);
    const enemy = actor("enemy", "TEAM_B");
    const bm = battle([hero, enemy], { hero: { x: 0, y: 0 }, enemy: { x: 8, y: 8 } });
    const before = JSON.stringify({ grid: bm.grid, rng: bm.rng.state(), events: bm.events, mana: hero.mana });
    expect(bm.moveEntity(hero.id, { x: -1, y: 0 })).toBe(false);
    expect(bm.moveEntity(enemy.id, { x: 7, y: 8 })).toBe(false);
    expect(bm.safeCastSpatial(hero.id, "hero-fireball", { aim: "global" })).toBeNull();
    expect(bm.safeCastSpatial(hero.id, "hero-fireball", { aim: "tile", tile: { x: 1, y: 0 } })).toBeNull();
    expect(bm.safeCastSpell(hero.id, "hero-fireball", [enemy.id])).toBeNull();
    expect(hero.spells[0]!.cast(hero, [enemy])).toBeNull();
    expect(JSON.stringify({ grid: bm.grid, rng: bm.rng.state(), events: bm.events, mana: hero.mana })).toBe(before);
  });

  test("pass and a legal optional-proc miss each end an activation", () => {
    let observedMiss = false;
    for (let i = 0; i < 20 && !observedMiss; i++) {
      const hero = actor("hero", "TEAM_A", ["battle-roar"]);
      const enemy = actor("enemy", "TEAM_B");
      const bm = battle([hero, enemy], { hero: { x: 1, y: 1 }, enemy: { x: 2, y: 1 } }, [], `miss-${i}`);
      const events = bm.safeCastSpatial(hero.id, "hero-battle-roar", { aim: "tile", tile: { x: 2, y: 1 } });
      expect(events).not.toBeNull();
      expect(bm.grid!.activation).toBeNull();
      expect(bm.moveEntity(hero.id, { x: 1, y: 2 })).toBe(false);
      expect(bm.revision).toBe(1);
      observedMiss = enemy.activeEffects.length === 0;
      if (observedMiss) {
        bm.postTurn(); bm.preTurn();
        expect(bm.passTurn(enemy.id)).toBe(true);
        expect(bm.revision).toBe(2);
        expect(bm.grid!.activation).toBeNull();
      }
    }
    expect(observedMiss).toBe(true);
  });

  test("an extra action receives fresh Movement with a distinct activation", () => {
    const hero = actor("hero", "TEAM_A", ["fleetfoot-gambit"]);
    const bm = battle([hero, actor("enemy", "TEAM_B")], { hero: { x: 1, y: 1 }, enemy: { x: 7, y: 7 } });
    expect(bm.safeCastSpatial(hero.id, "hero-fleetfoot-gambit", { aim: "tile", tile: { x: 1, y: 1 } })).not.toBeNull();
    bm.postTurn(); bm.preTurn(); pass(bm);
    expect(bm.getCurrentRound().orderQueue).toEqual(["hero", "enemy", "hero"]);
    const firstId = bm.grid!.activation!.id;
    expect(bm.moveEntity(hero.id, { x: 4, y: 1 })).toBe(true);
    pass(bm); pass(bm);
    expect(bm.grid!.activation!.entityId).toBe(hero.id);
    expect(bm.grid!.activation!.id).not.toBe(firstId);
    expect(bm.grid!.activation!.spent).toBe(0);
    expect(bm.moveEntity(hero.id, { x: 7, y: 1 })).toBe(true);
  });

  test("stunned actors receive no activation or voluntary movement", () => {
    const hero = actor("hero", "TEAM_A");
    const enemy = actor("enemy", "TEAM_B");
    const bm = battle([hero, enemy], { hero: { x: 1, y: 1 }, enemy: { x: 7, y: 7 } });
    bm.handler.effect(hero.spells[0]!, new StunEffect(1), hero, enemy);
    pass(bm);
    expect(bm.grid!.activation!.entityId).toBe(hero.id);
    expect(bm.events.some(({ event }) => event.eventType === "ACTIVATION_START" && event.data.entityId === enemy.id)).toBe(false);
    expect(bm.moveEntity(enemy.id, { x: 6, y: 7 })).toBe(false);
  });
});

describe("tactical spell execution", () => {
  test("directional lines affect every covered enemy and ignore movement-only obstacles", () => {
    const hero = actor("hero", "TEAM_A", ["tidepiercer-thrust"]);
    const one = actor("one", "TEAM_B"), two = actor("two", "TEAM_B"), three = actor("three", "TEAM_B");
    const bm = battle([hero, one, two, three], {
      hero: { x: 1, y: 1 }, one: { x: 2, y: 1 }, two: { x: 4, y: 1 }, three: { x: 5, y: 1 },
    }, [{ x: 3, y: 1 }]);
    const events = bm.safeCastSpatial(hero.id, "hero-tidepiercer-thrust", { aim: "direction", direction: "east" })!;
    expect(one.health).toBeLessThan(500); expect(two.health).toBeLessThan(500); expect(three.health).toBe(500);
    expect(events[0]!.data.spatial!.recipientIds).toEqual(["one", "two"]);
    expect(events[0]!.data.spatial!.tiles).toContainEqual({ x: 3, y: 1 });
  });

  test("Fireball remains one recipient at range three while empty support cannot become self", () => {
    const hero = actor("hero", "TEAM_A", ["fireball", "single-heal"]);
    const one = actor("one", "TEAM_B"), two = actor("two", "TEAM_B");
    const bm = battle([hero, one, two], { hero: { x: 1, y: 1 }, one: { x: 4, y: 1 }, two: { x: 4, y: 2 } });
    expect(bm.safeCastSpatial(hero.id, "hero-single-heal", { aim: "tile", tile: { x: 2, y: 1 } })).toBeNull();
    expect(bm.safeCastSpatial(hero.id, "hero-fireball", { aim: "tile", tile: { x: 4, y: 1 } })).not.toBeNull();
    expect(one.health).toBeLessThan(500); expect(two.health).toBe(500);
  });

  test("Volt Lash records repeated strikes and skips dead candidates on later strikes", () => {
    const hero = actor("hero", "TEAM_A", ["volt-lash"]);
    const enemy = actor("enemy", "TEAM_B");
    const bm = battle([hero, enemy], { hero: { x: 1, y: 1 }, enemy: { x: 9, y: 7 } });
    const events = bm.safeCastSpatial(hero.id, "hero-volt-lash", { aim: "global" })!;
    expect(events[0]!.data.strikeOrder).toEqual(["enemy", "enemy", "enemy", "enemy"]);
    const weakHero = actor("hero", "TEAM_A", ["volt-lash"]), weakEnemy = actor("enemy", "TEAM_B");
    weakEnemy.health = 1;
    const killing = battle([weakHero, weakEnemy], { hero: { x: 1, y: 1 }, enemy: { x: 9, y: 7 } });
    const killingEvents = killing.safeCastSpatial(weakHero.id, "hero-volt-lash", { aim: "global" })!;
    expect(killingEvents[0]!.data.strikeOrder).toEqual(["enemy"]);
  });

  test("Storm Pulse samples at most three distinct candidates without changing preview RNG", () => {
    const hero = actor("hero", "TEAM_A", ["storm-pulse"]);
    const enemies = ["one", "two", "three", "four"].map(id => actor(id, "TEAM_B"));
    const bm = battle([hero, ...enemies], { hero: { x: 1, y: 1 }, one: { x: 8, y: 1 }, two: { x: 8, y: 3 }, three: { x: 8, y: 5 }, four: { x: 8, y: 7 } });
    const state = bm.rng.state();
    const preview = queryCast(bm.grid!, bm.entities, hero.id, hero.spells[0]!.config.targeting!, { aim: "global" });
    expect(preview.recipientIds).toHaveLength(4);
    expect(bm.rng.state()).toEqual(state);
    const events = bm.safeCastSpatial(hero.id, "hero-storm-pulse", { aim: "global" })!;
    expect(events[0]!.data.damageApplied!.size).toBe(3);
  });

  test("a configured local Volt Lash keeps every fresh strike inside the committed area", () => {
    const hero = actor("hero", "TEAM_A", ["volt-lash"]);
    hero.spells[0]!.config.targeting = {
      aim: "tile", recipients: "enemies", range: { min: 1, max: 3 }, affectedTiles: [[0, 0]],
    };
    const near = actor("near", "TEAM_B"), far = actor("far", "TEAM_B");
    const bm = battle([hero, near, far], { hero: { x: 1, y: 1 }, near: { x: 3, y: 1 }, far: { x: 8, y: 7 } });
    const result = bm.safeCastSpatial(hero.id, "hero-volt-lash", { aim: "tile", tile: { x: 3, y: 1 } })!;
    expect(result[0]!.data.strikeOrder).toEqual(["near", "near", "near", "near"]);
    expect(far.health).toBe(far.maxHealth);
  });

  test("delayed global discharge tracks original surviving enemy identities after movement and team changes", () => {
    const hero = actor("hero", "TEAM_A", ["arcane-channeling"]), ally = actor("ally", "TEAM_A");
    const original = actor("original", "TEAM_B"), converted = actor("converted", "TEAM_B");
    const bm = battle([hero, ally, original, converted], {
      hero: { x: 1, y: 1 }, ally: { x: 1, y: 3 }, original: { x: 8, y: 1 }, converted: { x: 8, y: 3 },
    });
    expect(bm.safeCastSpatial(hero.id, "hero-arcane-channeling", { aim: "global" })).not.toBeNull();
    bm.handler.effect(hero.spells[0]!, new MindControlEffect(10, converted.team), hero, converted);
    bm.handler.effect(original.spells[0]!, new MindControlEffect(10, ally.team), original, ally);
    bm.postTurn(); bm.preTurn();
    expect(bm.moveEntity(hero.id, { x: 2, y: 1 })).toBe(false);
    for (let step = 0; step < 15 && !bm.events.some(({ event }) => event.eventType === "SPELL_CAST" && event.data.origin === "delayed"); step++) {
      if (bm.grid!.activation!.entityId === original.id) bm.moveEntity(original.id, { x: 9, y: 1 });
      pass(bm);
    }
    const delayed = bm.events.flatMap(({ event }) => event.eventType === "SPELL_CAST" && event.data.origin === "delayed" ? [event.data] : []);
    expect(delayed).toHaveLength(1);
    expect([...delayed[0]!.damageApplied!.keys()]).toEqual([original.id]);
    expect(delayed[0]!.payment).toBeUndefined();
    expect(bm.grid!.positions[original.id]).toEqual({ x: 9, y: 1 });
    expect(bm.events.filter(({ event }) => event.eventType === "SPELL_CAST" && event.data.payment?.casterId === hero.id)).toHaveLength(1);
  });

  test("a dead body releases its cell for another living actor", () => {
    const hero = actor("hero", "TEAM_A", ["fireball"]), enemy = actor("enemy", "TEAM_B"), survivor = actor("survivor", "TEAM_B");
    enemy.health = 1;
    const bm = battle([hero, enemy, survivor], { hero: { x: 1, y: 1 }, enemy: { x: 2, y: 1 }, survivor: { x: 8, y: 7 } });
    expect(reachableTiles(bm.grid!, bm.entities, hero.id, 3).some(({ tile }) => tile.x === 2 && tile.y === 1)).toBe(false);
    bm.safeCastSpatial(hero.id, "hero-fireball", { aim: "tile", tile: { x: 2, y: 1 } });
    expect(enemy.health).toBe(0);
    expect(reachableTiles(bm.grid!, bm.entities, hero.id, 3).some(({ tile }) => tile.x === 2 && tile.y === 1)).toBe(true);
  });

  for (const { value: type } of SpellTypeSchema.options) {
    test(`authored ${type} can resolve a legal spatial selection`, () => {
      const hero = actor("hero", "TEAM_A", [type]);
      const enemies = ["one", "two", "three"].map(id => actor(id, "TEAM_B"));
      const bm = battle([hero, ...enemies], { hero: { x: 3, y: 3 }, one: { x: 3, y: 2 }, two: { x: 3, y: 1 }, three: { x: 4, y: 2 } });
      const selection = legalSelections(bm.grid!, bm.entities, hero.id, hero.spells[0]!.config.targeting!)[0]!;
      expect(selection).toBeDefined();
      expect(bm.safeCastSpatial(hero.id, `hero-${type}`, selection)).not.toBeNull();
      expect(bm.grid!.activation).toBeNull();
    });
  }
});

describe("weapon profiles", () => {
  test("AI damage estimates preserve RNG, recognize defenses and retain possible penetrating hits", () => {
    const hero = actor("hero", "TEAM_A", ["basic-attack", "fireball", "tidepiercer-thrust"]);
    hero.weaponAttackProfile = {
      targeting: { aim: "tile", range: { min: 1, max: 1 }, affectedTiles: [[0, 0]], recipients: "enemies" },
      damageType: "PHYSICAL", baseDamage: { min: 0, max: 15 }, scaling: [],
    };
    const enemy = actor("enemy", "TEAM_B");
    const bm = battle([hero, enemy], { hero: { x: 1, y: 1 }, enemy: { x: 2, y: 1 } });
    const rng = bm.rng.state();
    enemy.baseSpecialAttributes.armor = 10;
    expect(hero.spells[0]!.estimateDamage!(hero, enemy)).toBeGreaterThan(0);
    enemy.baseSpecialAttributes.armor = 100;
    expect(hero.spells[0]!.estimateDamage!(hero, enemy)).toBe(0);
    expect(hero.spells[1]!.estimateDamage!(hero, enemy)).toBeGreaterThan(0);
    enemy.baseSpecialAttributes.armor = 40;
    const before = { health: enemy.health, mana: hero.mana, events: bm.events.length };
    hero.spells.forEach(spell => spell.estimateDamage?.(hero, enemy));
    expect({ health: enemy.health, mana: hero.mana, events: bm.events.length }).toEqual(before);
    expect(bm.rng.state()).toEqual(rng);
  });

  test("staff uses magical ranged damage and Sword and unarmed remain melee", () => {
    for (const item of ["oakwarden-staff", "iron-sword", null] as const) {
      const hero = actor("hero", "TEAM_A"), enemy = actor("enemy", "TEAM_B");
      if (item) hero.equipped.WEAPON = itemFactory(item, "weapon", hero);
      enemy.baseSpecialAttributes.armor = 1000;
      const bm = battle([hero, enemy], { hero: { x: 1, y: 1 }, enemy: { x: 4, y: 1 } });
      const events = bm.safeCastSpatial(hero.id, "hero-basic-attack", { aim: "tile", tile: { x: 4, y: 1 } });
      if (item === "oakwarden-staff") {
        expect(events).not.toBeNull(); expect(enemy.health).toBeLessThan(500);
      } else expect(events).toBeNull();
    }
  });

  test("custom profiles combine current modified attributes and are captured independently", () => {
    const hero = actor("hero", "TEAM_A"), enemy = actor("enemy", "TEAM_B");
    const profile: WeaponAttackProfile = {
      targeting: { aim: "tile", range: { min: 1, max: 2 }, affectedTiles: [[0, 0]], recipients: "enemies" },
      damageType: "MAGICAL", baseDamage: { min: 10, max: 10 },
      scaling: [{ attribute: "strength", multiplier: 0.5 }, { attribute: "intelligence", multiplier: 0.25 }],
    };
    hero.weaponAttackProfile = profile;
    hero.attributeModifiers.push({ id: "strength", attribute: "strength", operation: "ADD", value: 10 });
    enemy.baseSpecialAttributes.magicResistance = 5;
    const bm = battle([hero, enemy], { hero: { x: 1, y: 1 }, enemy: { x: 3, y: 1 } });
    profile.baseDamage.min = profile.baseDamage.max = 1000;
    bm.safeCastSpatial(hero.id, "hero-basic-attack", { aim: "tile", tile: { x: 3, y: 1 } });
    expect(enemy.health).toBe(475);
  });
});
