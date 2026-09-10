import { expect } from "bun:test";
import { BM } from "../../../apps/game/src/bm";
import { Character } from "../../../apps/game/src/base-entity";
import { buildTimeline } from "../../../apps/client/src/routes/battle/-presentation/timeline";

export function combatState(bm: BM) {
  // Effect IDs are opaque nanoids, so compare their identity relationships and
  // rule data, not their spelling across independent reconstructions.
  const effectIds = new Map([...bm.effectTracking.keys()].map((id, index) => [id, `effect-${index}`]));
  const effectId = (id: string) => effectIds.get(id) ?? id;
  const events = structuredClone(bm.events);
  for (const { event } of events) {
    if ("effectId" in event.data) event.data.effectId = effectId(event.data.effectId);
    if ("effectsApplied" in event.data && event.data.effectsApplied) {
      event.data.effectsApplied = new Map([...event.data.effectsApplied].map(([id, effects]) => [id, effects.map(effectId)]));
    }
  }
  return structuredClone({
    events,
    effectTracking: [...bm.effectTracking].map(([id, effect]) => ({ ...effect, id: effectId(id) })),
    rounds: bm.rounds,
    rng: bm.rng.state!(),
    dead: [...bm.deadEntities.keys()].sort(),
    entities: bm.entities.map((e) => ({
      id: e.id, health: e.health, mana: e.mana,
      cooldowns: e.spells.map((s) => [s.config.id, s.currentCooldown]),
      effects: e.activeEffects.map((effect) => [effectId(effect.id), effect.effectType, effect.duration]),
      // Modifier identity is intentionally nondeterministic; its rule is not.
      modifiers: e.attributeModifiers.map(({ attribute, operation, value }) => ({ attribute, operation, value })),
    })),
  });
}

export function expectCoherentCombat(bm: BM) {
  const queue = bm.getCurrentRound().orderQueue;
  // Extra-action effects may deliberately enqueue an actor more than once.
  for (const entity of bm.entities) {
    for (const [name, value, max] of [["health", entity.health, entity.maxHealth], ["mana", entity.mana, entity.maxMana]] as const) {
      expect(Number.isFinite(value), `${entity.id} ${name} is finite`).toBe(true);
      expect(value, `${entity.id} ${name}`).toBeGreaterThanOrEqual(0);
      expect(value, `${entity.id} ${name}`).toBeLessThanOrEqual(max);
    }
    expect(entity.isDead(), `${entity.id} death agrees with HP`).toBe(entity.health === 0);
    if (bm.deadEntities.has(entity.id)) expect(entity.health, "ordinary healing cannot revive").toBe(0);
    if (entity.isDead()) expect(queue, "dead actors cannot act").not.toContain(entity.id);
  }
  for (const id of queue) expect(bm.getEntityById(id), "queued actor exists").toBeDefined();
  if (!bm.isGameOver()) {
    expect(queue.length, "an unfinished battle must have a next actor").toBeGreaterThan(0);
    expect(bm.getEntityById(queue[0]!), "command driver returns control to a player").toBeInstanceOf(Character);
  }
}

export function expectClientMatchesServer(bm: BM) {
  const display = buildTimeline(bm.startEntityData, bm.events, undefined, bm.effectTracking).at(-1)!;
  for (const entity of bm.entities) {
    const stat = display.stats.get(entity.id)!;
    expect({
      health: stat.health, mana: stat.mana, dead: stat.flags.dead,
      cooldowns: entity.spells.map((s) => [s.config.id, stat.cooldowns.get(s.config.id)]),
      effects: [...stat.activeEffects].sort(),
    }, `client reconstruction for ${entity.id}`).toEqual({
      health: entity.health, mana: entity.mana, dead: entity.isDead(),
      cooldowns: entity.spells.map((s) => [s.config.id, s.currentCooldown]),
      effects: entity.activeEffects.map((e) => e.id).sort(),
    });
  }
}
