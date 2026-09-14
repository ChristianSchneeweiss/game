import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type {
  GridState,
  SpatialActor,
  Targeting,
} from "@loot-game/game/tactical/types";
import { enemyThreat } from "@loot-game/game/tactical/threat";
import type { Stats } from "./timeline";

/** Threat is a possible next action, never a prediction or a random draw. */
export function buildThreatPreview(
  grid: GridState,
  actors: readonly (SpatialActor & { movement?: number })[],
  participants: Entity[],
  entityId: string,
  stats: Map<string, Stats>,
  events: TimelineEventFull[],
  effects: EffectTracking,
) {
  const actor = actors.find(
    (entry) => entry.id === entityId && entry.health > 0,
  );
  const entity = participants.find((entry) => entry.id === entityId);
  if (!actor || !entity) return undefined;
  const current = stats.get(entityId);
  const locked = current?.activeEffects.some((id) => {
    const effect = effects.get(id);
    return effect?.effectType === "STUN" || effect?.effectType === "CHARGE";
  });
  const spells: Targeting[] = [];
  if (!locked) {
    for (const spell of entity.spells) {
      if (
        (current?.mana ?? entity.mana) < spell.config.manaCost ||
        (current?.cooldowns.get(spell.config.id) ?? spell.currentCooldown) > 0
      )
        continue;
      const targeting =
        spell.config.type === "basic-attack"
          ? (entity.weaponAttackProfile?.targeting ?? spell.config.targeting)
          : spell.config.targeting;
      if (targeting) spells.push(targeting);
    }
  }
  const threat = enemyThreat(
    grid,
    actors,
    entityId,
    locked ? 0 : (actor.movement ?? 3),
    spells,
  );
  const chargedRecipients = new Set<string>();
  const activeEffects = new Set(current?.activeEffects);
  const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
  for (const { event } of events) {
    if (
      event.eventType !== "SPELL_CAST" ||
      event.data.spatial?.casterId !== entityId
    )
      continue;
    const activeCharge = [...(event.data.effectsApplied?.values() ?? [])]
      .flat()
      .some(
        (id) =>
          effects.get(id)?.effectType === "CHARGE" && activeEffects.has(id),
      );
    if (activeCharge)
      for (const id of event.data.spatial.recipientIds) {
        const target = actorsById.get(id);
        if (target && target.health > 0 && target.team !== actor.team)
          chargedRecipients.add(id);
      }
  }
  return {
    movement: threat.movementTiles,
    attacks: threat.attackTiles,
    chargedRecipientIds: [...chargedRecipients],
  };
}
