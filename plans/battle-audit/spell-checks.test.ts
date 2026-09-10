import { afterAll, describe, expect, spyOn, test } from "bun:test";
import seedrandom from "seedrandom";
import { BaseEntity, Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import type { Entity } from "../../apps/game/src/entity-types";
import { EnemyTypeSchema } from "../../apps/game/src/enemies/base/enemy-types";
import { randomInArray } from "../../apps/game/src/utils/random-in-array";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import { SpellTypeSchema, type SpellType } from "../../apps/game/src/spells/base/spell-types";
import { castBattleSpell, describeBattleSpell, getBattleTargets } from "../../apps/server/src/battle/commands";
import { createEnemyFromType } from "../../apps/server/src/game-usecases/enemy-factory";

// Audit regression tests assert intended invariants and fail on current bugs.
const logs = spyOn(console, "log").mockImplementation(() => {});
const errors = spyOn(console, "error").mockImplementation(() => {});
afterAll(() => { logs.mockRestore(); errors.mockRestore(); });

const owner = "spell-audit-owner";
const registered = SpellTypeSchema.options.map((option) => option.value);

function fixture(type: SpellType, seed = "spell-audit", enemyCount = 4, allyCount = 2) {
  const caster = new Character("caster", owner, "Caster", "TEAM_A", 1000, 1000,
    { strength: 20, intelligence: 20, vitality: 20, agility: 100 }, 0, 1, 0);
  caster.spells = [createSpellFromType(`caster-${type}`, type)];
  const allies = Array.from({ length: allyCount }, (_, i) => new Character(`ally-${i}`, owner,
    `Ally ${i}`, "TEAM_A", 1000, 1000,
    { strength: 20, intelligence: 20, vitality: 20, agility: 90 - i }, 0, 1, 0));
  const enemies = Array.from({ length: enemyCount }, (_, i) => new BaseEntity(`enemy-${i}`,
    `Enemy ${i}`, "TEAM_B", 1000, 1000,
    { strength: 20, intelligence: 20, vitality: 20, agility: 10 - i }));
  const bm = new BM([caster, ...allies, ...enemies], seed);
  bm.start();
  return { bm, caster, allies, enemies, spell: caster.spells[0]! };
}

function command(f: ReturnType<typeof fixture>) {
  const data = { entityId: f.caster.id, spellId: f.spell.config.id };
  const legal = getBattleTargets(f.bm, data);
  const targetIds = [
    ...legal.targets.filter((id) => f.bm.getEntityById(id)!.team !== f.caster.team).slice(0, legal.enemies),
    ...legal.targets.filter((id) => f.bm.getEntityById(id)!.team === f.caster.team).slice(0, legal.allies),
  ];
  return { ...data, targetIds };
}

function cast(f: ReturnType<typeof fixture>) {
  return castBattleSpell(f.bm, command(f), owner);
}

function compactState(f: ReturnType<typeof fixture>) {
  return JSON.stringify({
    rng: f.bm.rng.state!(),
    queue: f.bm.getCurrentRound().orderQueue,
    eventCount: f.bm.events.length,
    entities: f.bm.entities.map((e) => ({
      id: e.id, health: e.health, mana: e.mana,
      cooldown: e.spells.map((s) => s.currentCooldown),
      effects: e.activeEffects.map((effect) => effect.id),
      modifiers: e.attributeModifiers,
    })),
  });
}

function checkResources(entities: Entity[]) {
  for (const entity of entities) {
    expect(Number.isFinite(entity.health), `${entity.id} HP`).toBe(true);
    expect(Number.isFinite(entity.mana), `${entity.id} mana`).toBe(true);
    expect(entity.health).toBeGreaterThanOrEqual(0);
    expect(entity.health).toBeLessThanOrEqual(entity.maxHealth);
    expect(entity.mana).toBeGreaterThanOrEqual(0);
    expect(entity.mana).toBeLessThanOrEqual(entity.maxMana);
  }
}

describe("all registered spells through real server target/cast commands", () => {
  test("covers every current registration", () => expect(registered).toHaveLength(39));
  for (const type of registered) {
    test(`${type}: legal sets, readonly descriptions, resource bounds across 64 scenarios`, () => {
      const rejections: string[] = [];
      for (let seed = 0; seed < 16; seed++) {
        for (const scenario of ["full", "wounded", "single", "dead"] as const) {
          const f = fixture(type, `spell-audit-${seed}`, scenario === "single" ? 1 : 4);
          if (scenario === "wounded") {
            f.caster.health = 200;
            f.allies.forEach((ally) => { ally.health = 250; });
            f.enemies.forEach((enemy) => { enemy.health = 100; });
          }
          if (scenario === "dead") {
            f.allies[1]!.health = 0;
            f.enemies[3]!.health = 0;
          }
          const beforeRead = compactState(f);
          expect(describeBattleSpell(f.bm, f.caster, f.spell).text).toBeString();
          const data = command(f);
          expect(compactState(f)).toBe(beforeRead);
          let rejection: string | undefined;
          try { castBattleSpell(f.bm, data, owner); }
          catch (error) { rejection = String(error); }
          if (rejection) {
            rejections.push(`${scenario} seed ${seed}: ${rejection}`);
          }
          checkResources([f.caster, ...f.allies, ...f.enemies]);
          expect(f.caster.mana).toBe(1000 - f.spell.config.manaCost);
          if (!rejection) {
            expect(f.bm.events.some(({ event }) => event.eventType === "SPELL_CAST"
              && event.data.spellId === f.spell.config.id)).toBe(true);
          }
        }
      }
      expect(rejections, `${type}: legal casts must not reject after spending resources`).toEqual([]);
    });
  }
});

describe("spell correctness regressions", () => {
  test("every inventory spell can be described before being assigned to a battle", () => {
    const caster = new Character("inventory-caster", owner, "Caster", "TEAM_A", 1000, 1000,
      { strength: 20, intelligence: 20, vitality: 20, agility: 100 }, 0, 1, 0);
    const failures: { type: SpellType; error: string }[] = [];
    for (const type of registered) {
      // Mirrors getMySpells: createSpellFromType(spell.id, spell.type).description(character).
      try { createSpellFromType(`inventory-${type}`, type).description(caster); }
      catch (error) { failures.push({ type, error: String(error) }); }
    }
    expect(failures).toEqual([]);
  });

  test("Aegis Wall applies a shield to each living ally without throwing", () => {
    const f = fixture("aegis-wall");
    expect(() => cast(f)).not.toThrow();
    expect(f.caster.mana).toBe(965);
    expect(f.caster.activeEffects.length).toBeGreaterThan(0);
    expect(f.allies.every((ally) => ally.activeEffects.length > 0)).toBe(true);
  });

  test("Storm Pulse damages only enemies in a three-entity battle", () => {
    const f = fixture("storm-pulse", "storm-friendly-fire", 1, 1);
    cast(f);
    expect(f.caster.health).toBe(1000);
    expect(f.allies[0]!.health).toBe(1000);
    expect(f.enemies[0]!.health).toBeLessThan(1000);
    expect(f.spell.description(f.caster).text).toContain("random enemies");
  });

  test("Battle Roar's ordinary failed stun records a spent cast and advances the turn", () => {
    const f = fixture("battle-roar");
    f.bm.rng = seedrandom("battle-roar-whiff", { state: true });
    // Select a real seed whose second sample (after the D20) fails 60% chance.
    let seed = 0;
    while (true) {
      const candidate = seedrandom(`roar-whiff-${seed}`, { state: true });
      candidate();
      if (candidate() >= 0.6) break;
      seed++;
    }
    f.bm.rng = seedrandom(`roar-whiff-${seed}`, { state: true });
    const beforeEvents = f.bm.events.length;
    expect(() => cast(f)).not.toThrow();
    expect(f.caster.mana).toBe(985);
    expect(f.spell.currentCooldown).toBe(3);
    expect(f.bm.getCurrentRound().orderQueue[0]).toBe(f.allies[0]!.id);
    expect(f.bm.events.length).toBeGreaterThan(beforeEvents);
    expect(f.enemies[0]!.activeEffects).toHaveLength(0);
  });

  test("a Sky Serpent's failed Battle Roar never leaves the command driver stuck on a bot turn", () => {
    const rejections: string[] = [];
    for (let seed = 0; seed < 16; seed++) {
      const f = fixture("basic-attack", `serpent-roar-${seed}`, 0, 0);
      const serpent = createEnemyFromType("sky-serpent", "serpent");
      serpent.spells[0]!.currentCooldown = 1;
      const bm = new BM([f.caster, serpent], `serpent-roar-${seed}`);
      bm.start();
      try {
        castBattleSpell(bm, { entityId: f.caster.id, spellId: f.spell.config.id, targetIds: [serpent.id] }, owner);
      } catch (error) {
        rejections.push(`seed ${seed}: ${String(error)}; active=${bm.getCurrentRound().orderQueue[0]}`);
      }
    }
    expect(rejections).toEqual([]);
  });

  test("Earthshatter grants its promised defenses after stunning multiple enemies", () => {
    let successful: ReturnType<typeof fixture> | undefined;
    for (let seed = 0; seed < 30; seed++) {
      const f = fixture("earthshatter", `earthshatter-${seed}`);
      cast(f);
      const event = f.bm.events.find(({ event }) => event.eventType === "SPELL_CAST"
        && event.data.spellId === f.spell.config.id)?.event;
      if (event?.eventType === "SPELL_CAST" && (event.data.effectsApplied?.size ?? 0) >= 2) {
        successful = f;
        break;
      }
    }
    expect(successful).toBeDefined();
    const f = successful!;
    expect(f.spell.description(f.caster).text).toContain("gain +20 Armor and Magic Resistance");
    expect(f.caster.getAttribute("armor")).toBe(20);
    expect(f.caster.getAttribute("magicResistance")).toBe(20);
  });

  // This documents the current 0.1% threshold without assuming a design decision
  // that Final Verdict must instead execute at 10%.
  test("Final Verdict currently has a 0.1% threshold, requiring a design decision", () => {
    const f = fixture("final-verdict", "verdict-threshold");
    f.enemies[0]!.health = 50;
    cast(f);
    expect(f.enemies[0]!.health).toBeGreaterThan(0);
    expect(f.enemies[0]!.health).toBeLessThan(50);
  });

  test("Arcane Channeling still damages surviving targets when one selected enemy dies", () => {
    const f = fixture("arcane-channeling", "charge-dead-target", 2);
    cast(f);
    f.bm.handler.damage(f.spell, 2000, "MAGICAL", f.caster, f.enemies[0]!);
    expect(f.enemies[0]!.isDead()).toBe(true);
    expect(f.caster.activeEffects.some((effect) => effect.effectType === "CHARGE")).toBe(true);
    // Normal entity end-step invokes the installed charge's release. Drive this
    // hook directly to isolate target validation from audited queue bookkeeping.
    f.caster.onEndStep();
    expect(f.enemies[1]!.health).toBeLessThan(1000);
    const casts = f.bm.events.filter(({ event }) => event.eventType === "SPELL_CAST"
      && event.data.spellId === f.spell.config.id);
    expect(casts).toHaveLength(2);
  });

  test("multi-hit spells never send later hits to a target that has already died", () => {
    const corpseHits: { type: SpellType; seed: number; targetId: string }[] = [];
    for (const type of ["volt-lash", "bladestorm-rhythm"] as const) {
      for (let seed = 0; seed < 16; seed++) {
        const f = fixture(type, `multi-hit-${seed}`, 2);
        f.enemies[0]!.health = 1;
        const applyDamage = f.bm.handler.damage.bind(f.bm.handler);
        const observed = spyOn(f.bm.handler, "damage").mockImplementation((...args) => {
          if (args[4].isDead()) corpseHits.push({ type, seed, targetId: args[4].id });
          return applyDamage(...args);
        });
        cast(f);
        observed.mockRestore();
      }
    }
    expect(corpseHits).toEqual([]);
  });

  test("Tidepiercer Thrust's advertised armor-ignore proc penetrates otherwise blocking armor", () => {
    let damagingCasts = 0;
    for (let seed = 0; seed < 64; seed++) {
      const f = fixture("tidepiercer-thrust", `tidepiercer-${seed}`);
      // The attack has 32–37 raw damage. Ignoring 25% of 40 armor leaves 30
      // armor, so each advertised proc must deal 2–7 damage.
      f.enemies[0]!.baseSpecialAttributes.armor = 40;
      cast(f);
      if (f.enemies[0]!.health < 1000) damagingCasts++;
    }
    expect(damagingCasts).toBeGreaterThan(0);
  });
});

describe("registered enemy targeting", () => {
  test("random target choice gives equal-sized enemy slots equal probability", () => {
    const slots = ["enemy-0", "enemy-1", "enemy-2", "enemy-3"];
    const counts = new Map(slots.map((slot) => [slot, 0]));
    const rng = seedrandom("target-distribution-audit");
    for (let i = 0; i < 60000; i++) {
      const target = randomInArray(slots, rng)!;
      counts.set(target, counts.get(target)! + 1);
    }
    for (const [slot, count] of counts) {
      expect(count, `${slot}: ${JSON.stringify(Object.fromEntries(counts))}`).toBeGreaterThan(13500);
      expect(count, slot).toBeLessThan(16500);
    }
  });

  for (const option of EnemyTypeSchema.options) {
    const type = option.value;
    test(`${type}: each spell selects legal living targets and empty mana falls back`, () => {
      for (const depleted of [false, true]) {
        for (let spellIndex = 0; ; spellIndex++) {
          const enemy = createEnemyFromType(type, `ai-${type}`);
          if (spellIndex >= enemy.spells.length) break;
          // Effects/passives have a separate audit; isolate the stock AI's spell
          // priority and target choice using the real registered loadout.
          enemy.passiveSkills = [];
          enemy.baseAttributes.agility = 200;
          enemy.mana = depleted ? 0 : enemy.maxMana;
          enemy.spells.slice(0, spellIndex).forEach((spell) => { spell.currentCooldown = 1; });
          const context = fixture("basic-attack", `ai-${type}-${spellIndex}-${depleted}`);
          const opponent = context.caster;
          const deadAlly = context.enemies[0]!;
          deadAlly.health = 0;
          const bm = new BM([enemy, deadAlly, ...context.allies, opponent], `ai-${type}-${spellIndex}-${depleted}`);
          bm.start();
          const action = enemy.getAction();
          expect(action.spell.canCast(enemy)).toBe(true);
          expect(new Set(action.targets).size).toBe(action.targets.length);
          const targetType = action.spell.getTargetType();
          const valid = action.spell.getValidTargets(enemy);
          expect(action.targets.every((target) => valid.includes(target) && !target.isDead())).toBe(true);
          expect(action.targets.filter((target) => target.team !== enemy.team).length)
            .toBe(Math.min(targetType.enemies, valid.filter((target) => target.team !== enemy.team).length));
          expect(action.targets.filter((target) => target.team === enemy.team).length)
            .toBe(Math.min(targetType.allies, valid.filter((target) => target.team === enemy.team).length));
          if (depleted) expect(action.spell.config.manaCost).toBe(0);
        }
      }
    });
  }
});
