import { expect } from "bun:test";
import { BaseEntity, Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import type { Entity } from "../../../apps/game/src/entity-types";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import { SpellTypeSchema, type SpellType } from "../../../apps/game/src/spells/base/spell-types";
import { castBattleSpell, getBattleTargets } from "../../../apps/server/src/battle/commands";
import { passiveSkillFactory } from "../../../apps/game/src/passive-skills/base/passive-skill.factory";
import type { PassiveType } from "../../../apps/game/src/passive-skills/base/passive-types";

export const owner = "spell-audit-owner";
export const registered = SpellTypeSchema.options.map((option) => option.value);

export function fixture(type: SpellType, seed = "spell-audit", enemyCount = 4, allyCount = 2, passives: PassiveType[] = []) {
  const caster = new Character("caster", owner, "Caster", "TEAM_A", 1000, 1000,
    { strength: 20, intelligence: 20, vitality: 20, agility: 100 }, 0, 1, 0);
  caster.spells = [createSpellFromType(`caster-${type}`, type)];
  caster.passiveSkills = passives.map((passive) => passiveSkillFactory(passive, `${caster.id}-${passive}`, caster));
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

export function command(f: ReturnType<typeof fixture>) {
  const data = { entityId: f.caster.id, spellId: f.spell.config.id };
  const legal = getBattleTargets(f.bm, data);
  const targetIds = [
    ...legal.targets.filter((id) => f.bm.getEntityById(id)!.team !== f.caster.team).slice(0, legal.enemies),
    ...legal.targets.filter((id) => f.bm.getEntityById(id)!.team === f.caster.team).slice(0, legal.allies),
  ];
  return { ...data, targetIds };
}

export function cast(f: ReturnType<typeof fixture>) {
  return castBattleSpell(f.bm, command(f), owner);
}

export function compactState(f: ReturnType<typeof fixture>) {
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

export function checkResources(entities: Entity[]) {
  for (const entity of entities) {
    expect(Number.isFinite(entity.health), `${entity.id} HP`).toBe(true);
    expect(Number.isFinite(entity.mana), `${entity.id} mana`).toBe(true);
    expect(entity.health).toBeGreaterThanOrEqual(0);
    expect(entity.health).toBeLessThanOrEqual(entity.maxHealth);
    expect(entity.mana).toBeGreaterThanOrEqual(0);
    expect(entity.mana).toBeLessThanOrEqual(entity.maxMana);
  }
}
