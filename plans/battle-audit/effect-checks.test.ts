import { describe, expect, test } from "bun:test";
import { Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { calculator } from "../../apps/game/src/calculator";
import { StatModifierEffect } from "../../apps/game/src/effect/stat-modifier.effect";
import { passiveSkillFactory } from "../../apps/game/src/passive-skills/base/passive-skill.factory";
import { PassiveTypeSchema, type PassiveType } from "../../apps/game/src/passive-skills/base/passive-types";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import { SpellTypeSchema, type SpellType } from "../../apps/game/src/spells/base/spell-types";

// Regression expectations discovered during the audit. These deliberately fail
// until the corresponding engine bugs are fixed; no application source is edited.
function quiet(body: () => void) {
  const log = console.log;
  console.log = () => {};
  try {
    body();
  } finally {
    console.log = log;
  }
}

function character(
  id: string,
  team: "TEAM_A" | "TEAM_B",
  spellTypes: SpellType[] = ["basic-attack"],
  passives: PassiveType[] = [],
) {
  const entity = new Character(
    id, "audit-owner", id, team, 200, 200,
    { strength: 20, intelligence: 20, vitality: 20, agility: 20 },
    0, 1, 0,
  );
  entity.spells = spellTypes.map((type) => createSpellFromType(`${id}-${type}`, type));
  entity.passiveSkills = passives.map((type) =>
    passiveSkillFactory(type, `${id}-${type}`, entity),
  );
  return entity;
}

function battle(...entities: Character[]) {
  const bm = new BM(entities, "effects-audit-deterministic");
  bm.start();
  return bm;
}

describe("battle effects audit: required invariants", () => {
  test("Bloodfang permits magical spells and publishes their completed cast", () => quiet(() => {
    const caster = character("caster", "TEAM_A", ["fireball"], ["bloodfang"]);
    const target = character("target", "TEAM_B");
    const bm = battle(caster, target);
    const spell = caster.spells[0]!;
    expect(() => bm.safeCastSpell(caster.id, spell.config.id, [target.id])).not.toThrow();
    expect(target.health).toBeLessThan(target.maxHealth);
    expect(caster.mana).toBe(caster.maxMana - spell.config.manaCost);
    expect(spell.currentCooldown).toBe(spell.config.cooldown + 1);
    expect(bm.events.filter(({ event }) => event.eventType === "SPELL_CAST" && event.data.spellId === spell.config.id)).toHaveLength(1);
  }));

  test("Soulleech permits Basic Attack", () => quiet(() => {
    const caster = character("caster", "TEAM_A", ["basic-attack"], ["soulleech"]);
    const target = character("target", "TEAM_B");
    const bm = battle(caster, target);
    expect(() => bm.safeCastSpell(caster.id, caster.spells[0]!.config.id, [target.id])).not.toThrow();
    expect(target.health).toBeLessThan(target.maxHealth);
  }));

  test("control: matching physical lifesteal completes and heals", () => quiet(() => {
    const caster = character("caster", "TEAM_A", ["basic-attack"], ["bloodfang"]);
    const target = character("target", "TEAM_B");
    const bm = battle(caster, target);
    caster.health = 50;
    const result = bm.handler.damage(caster.spells[0]!, 100, "PHYSICAL", caster, target);
    expect(result.totalDamage).toBe(100);
    expect(caster.health).toBe(60);
    expect(target.health).toBe(100);
  }));

  test("Aegis Wall completes and attaches a shield", () => quiet(() => {
    const caster = character("caster", "TEAM_A", ["aegis-wall"]);
    const target = character("target", "TEAM_B");
    const bm = battle(caster, target);
    const spell = caster.spells[0]!;
    expect(() => bm.safeCastSpell(caster.id, spell.config.id, [caster.id])).not.toThrow();
    expect(caster.mana).toBe(165);
    expect(spell.currentCooldown).toBe(7);
    expect(caster.activeEffects.filter((effect) => effect.effectType === "SHIELD")).toHaveLength(1);
  }));

  test("opposing Thorn Carapaces finish a hit without recursive reflection", () => quiet(() => {
    const caster = character("caster", "TEAM_A", ["basic-attack"], ["thorn-carapace"]);
    const target = character("target", "TEAM_B", ["basic-attack"], ["thorn-carapace"]);
    const bm = battle(caster, target);
    expect(() => bm.safeCastSpell(caster.id, caster.spells[0]!.config.id, [target.id])).not.toThrow();
    expect(caster.health).toBeLessThan(caster.maxHealth);
    expect(target.health).toBeLessThan(target.maxHealth);
  }));

  test("Deflecting Stance and opposing Thorn Carapace finish a hit", () => quiet(() => {
    const caster = character("caster", "TEAM_A", ["deflecting-stance", "basic-attack"]);
    const target = character("target", "TEAM_B", ["basic-attack"], ["thorn-carapace"]);
    const bm = battle(caster, target);
    expect(bm.safeCastSpell(caster.id, caster.spells[0]!.config.id, [caster.id])).not.toBeNull();
    expect(() => bm.handler.damage(caster.spells[1]!, 100, "PHYSICAL", caster, target)).not.toThrow();
  }));

  test("critical damage lookup includes the configured base critical multiplier", () => quiet(() => {
    const caster = character("caster", "TEAM_A");
    const target = character("target", "TEAM_B");
    const bm = battle(caster, target);
    caster.baseSpecialAttributes.critChance = 1;
    expect(caster.baseSpecialAttributes.critDamage).toBe(1);
    expect(caster.getAttribute("critDamage")).toBe(1);
    const result = calculator.calculateRealDamage(caster, target, 100, "PHYSICAL", bm.getPRNG());
    expect(result).toEqual({ damage: 200, isCrit: true });
  }));

  test("Mystic Flow and Vital Wellspring improve actual upkeep regeneration", () => quiet(() => {
    const boosted = character("boosted", "TEAM_A", ["basic-attack"], ["mystic-flow", "vital-wellspring"]);
    const baseline = character("baseline", "TEAM_B");
    battle(boosted, baseline);
    boosted.health = baseline.health = 10;
    boosted.mana = baseline.mana = 10;
    expect(boosted.getAttribute("healthRegen")).toBeGreaterThan(baseline.getAttribute("healthRegen"));
    expect(boosted.getAttribute("manaRegen")).toBeGreaterThan(baseline.getAttribute("manaRegen"));
    boosted.onUpkeep();
    baseline.onUpkeep();
    expect(boosted.health).toBeGreaterThan(baseline.health);
    expect(boosted.mana).toBeGreaterThan(baseline.mana);
  }));

  test("Titan's Resurgence registers a healing effect that ticks and expires safely", () => quiet(() => {
    const holder = character("holder", "TEAM_A", ["basic-attack"], ["titans-resurgence"]);
    const opponent = character("opponent", "TEAM_B");
    holder.health = 25;
    const bm = battle(holder, opponent);
    const hot = holder.activeEffects.find((effect) => effect.effectType === "HOT")!;
    expect(hot).toBeDefined();
    expect(hot.battleManager === bm).toBe(true);
    expect(bm.lifeCycleHooks).toContain(hot);
    bm.onPostRound();
    expect(holder.health).toBe(40);
    holder.onEndStep();
    holder.onEndStep();
    holder.onEndStep();
    expect(() => holder.onEndStep()).not.toThrow();
    expect(holder.activeEffects).not.toContain(hot);
  }));

  test("lifesteal cannot revive a caster killed by the target's reflection", () => quiet(() => {
    const caster = character("caster", "TEAM_A", ["basic-attack"], ["bloodfang"]);
    const target = character("target", "TEAM_B", ["basic-attack"], ["thorn-carapace"]);
    const bm = battle(caster, target);
    caster.health = 1;
    const result = bm.handler.damage(caster.spells[0]!, 100, "PHYSICAL", caster, target);
    expect(result.totalDamage).toBe(100);
    expect(caster.health).toBe(0);
    expect(caster.isDead()).toBe(true);
    expect(bm.deadEntities.has(caster.id)).toBe(true);
    expect(bm.getCurrentRound().orderQueue).not.toContain(caster.id);
    expect(bm.spellCastBuffer.some((event) => event.eventType === "DEATH" && event.data.id === caster.id)).toBe(true);
  }));

  test("a two-turn Cinderbrand burn ticks twice regardless of caster initiative", () => quiet(() => {
    function burnDamage(casterAgility: number) {
      const caster = character("caster", "TEAM_A", ["cinderbrand"]);
      const target = character("target", "TEAM_B");
      caster.baseAttributes.agility = casterAgility;
      const bm = battle(caster, target);
      if (bm.getCurrentRound().orderQueue[0] === target.id) bm.postTurn();
      // This seed's third roll is 0.2854, which procs Cinderbrand's authored 30% burn.
      expect(bm.safeCastSpell(caster.id, caster.spells[0]!.config.id, [target.id])).not.toBeNull();
      const dot = target.activeEffects.find((effect) => effect.effectType === "DOT")!;
      expect(dot).toBeDefined();
      const healthAfterCast = target.health;
      for (let turn = 0; turn < 6; turn++) bm.postTurn();
      return {
        damage: healthAfterCast - target.health,
        ticks: bm.events.filter(({ event }) => event.eventType === "EFFECT_TRIGGER" && event.data.effectId === dot.id).length,
      };
    }
    expect(burnDamage(19)).toEqual({ damage: 10, ticks: 2 });
    expect(burnDamage(21)).toEqual({ damage: 10, ticks: 2 });
  }));

  test("control: stacked stat modifiers expire independently and restore the base stat", () => quiet(() => {
    const caster = character("caster", "TEAM_A");
    const target = character("target", "TEAM_B");
    const bm = battle(caster, target);
    const first = new StatModifierEffect("BUFF", [{ id: "first", attribute: "armor", operation: "ADD", value: 10 }], 1);
    const second = new StatModifierEffect("BUFF", [{ id: "second", attribute: "armor", operation: "ADD", value: 20 }], 2);
    bm.handler.effect(caster.spells[0]!, first, caster, caster);
    bm.handler.effect(caster.spells[0]!, second, caster, caster);
    expect(caster.getAttribute("armor")).toBe(30);
    caster.onEndStep();
    expect(caster.getAttribute("armor")).toBe(20);
    expect(bm.lifeCycleHooks).not.toContain(first);
    caster.onEndStep();
    expect(caster.getAttribute("armor")).toBe(0);
    expect(caster.activeEffects).toHaveLength(0);
    expect(bm.lifeCycleHooks).not.toContain(second);
  }));

  test("all 39 registered spells can resolve with each single registered passive", () => quiet(() => {
    const failures: { passive: string; spell: string; error: string }[] = [];
    const passives: (PassiveType | undefined)[] = [undefined, ...PassiveTypeSchema.options.map((option) => option.value)];
    let casts = 0;
    for (const passive of passives) {
      for (const type of SpellTypeSchema.options.map((option) => option.value)) {
        const caster = character("caster", "TEAM_A", [type], passive ? [passive] : []);
        const ally = character("ally", "TEAM_A");
        const target = character("target", "TEAM_B");
        const bm = battle(caster, ally, target);
        const spell = caster.spells[0]!;
        const targets = spell.getValidTargets(caster).map((entity) => entity.id);
        casts++;
        try {
          if (bm.safeCastSpell(caster.id, spell.config.id, targets) === null) {
            failures.push({ passive: passive ?? "none", spell: type, error: "legal cast rejected" });
          }
        } catch (error) {
          failures.push({ passive: passive ?? "none", spell: type, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
    expect(casts).toBe(429);
    expect(failures).toEqual([]);
  }));
});
