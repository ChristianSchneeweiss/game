import { describe, expect, test } from "bun:test";
import seedrandom from "seedrandom";
import { Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { randomInArray, uniqueRandomFromArray } from "../../../apps/game/src/utils/random-in-array";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../../apps/game/src/spells/base/spell-types";
import { castBattleSpell } from "../../../apps/server/src/battle/commands";
import { createEnemyFromType } from "../../../apps/server/src/game-usecases/enemy-factory";
import { owner, registered, fixture, cast } from "../support/spell-fixture";
import { passiveSkillFactory } from "../../../apps/game/src/passive-skills/base/passive-skill.factory";

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
    // Select a real seed whose second sample (after the D20) fails 60% chance.
    let seed: string | undefined;
    for (let index = 0; index < 64; index++) {
      const candidate = seedrandom(`roar-whiff-${index}`, { state: true });
      candidate();
      if (candidate() >= 0.6) { seed = `roar-whiff-${index}`; break; }
    }
    expect(seed, "the fixture exercises an unsuccessful optional proc").toBeDefined();
    f.bm.rng = seedrandom(seed!, { state: true });
    const beforeEvents = f.bm.events.length;
    expect(() => cast(f)).not.toThrow();
    expect(f.caster.mana).toBe(985);
    expect(f.spell.currentCooldown).toBeGreaterThan(0);
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

  test("Arcane Channeling still damages surviving targets when one selected enemy dies", () => {
    const f = fixture("arcane-channeling", "charge-dead-target", 2);
    cast(f);
    f.bm.handler.damage(f.spell, 2000, "MAGICAL", f.caster, f.enemies[0]!);
    expect(f.enemies[0]!.isDead()).toBe(true);
    expect(f.caster.activeEffects.some((effect) => effect.effectType === "CHARGE")).toBe(true);
    // Normal entity end-step invokes the installed charge's release. Drive this
    // hook directly to isolate target validation from audited queue bookkeeping.
    for (let step = 0; step < 3 && f.caster.activeEffects.some((effect) => effect.effectType === "CHARGE"); step++) f.caster.onEndStep();
    expect(f.enemies[1]!.health).toBeLessThan(1000);
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

  for (const type of ["volt-lash", "bladestorm-rhythm"] as const) {
    test(`${type}: a corpse cannot trigger retaliation on subsequent hits`, () => {
      let exercised = 0;
      for (let seed = 0; seed < 16; seed++) {
        const f = fixture(type, `multi-hit-${seed}`, 2);
        const victim = f.enemies[0]!;
        victim.health = 1;
        const thorns = passiveSkillFactory("thorn-carapace", "victim-thorns", victim);
        // Build a fresh battle so the passive is installed through normal join.
        victim.passiveSkills = [thorns];
        f.bm = new BM([f.caster, ...f.allies, ...f.enemies], `multi-hit-${seed}`);
        f.bm.start();
        cast(f);
        if (!victim.isDead()) continue;
        exercised++;
        const retaliations = f.bm.events.filter(({ event }) =>
          event.eventType === "EFFECT_TRIGGER" && event.data.effectId === thorns.id);
        expect(retaliations.length, `${type} seed=${seed}: only the lethal hit can trigger thorns`).toBe(1);
      }
      expect(exercised, "the seeds must exercise lethal hits").toBeGreaterThan(0);
    });
  }
});

describe("registered enemy targeting", () => {
  test("sampling without replacement is unique, non-mutating and position-neutral", () => {
    const slots = ["enemy-0", "enemy-1", "enemy-2", "enemy-3"];
    const counts = new Map(slots.map((slot) => [slot, 0]));
    const rng = seedrandom("unique-target-distribution");
    for (let i = 0; i < 12000; i++) {
      const selected = uniqueRandomFromArray(slots, 2, rng);
      expect(new Set(selected).size).toBe(2);
      expect(selected.every((id) => slots.includes(id))).toBe(true);
      for (const id of selected) counts.set(id, counts.get(id)! + 1);
    }
    expect(slots).toEqual(["enemy-0", "enemy-1", "enemy-2", "enemy-3"]);
    // Each slot has a 1/2 inclusion chance. ±10% is deliberately loose; this
    // fixed-seed check catches positional bias without a flaky tight threshold.
    for (const [slot, count] of counts) {
      expect(count, `${slot}: ${JSON.stringify(Object.fromEntries(counts))}`).toBeGreaterThan(5400);
      expect(count, slot).toBeLessThan(6600);
    }
  });
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

});
