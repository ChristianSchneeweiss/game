import type { Entity } from "@loot-game/game/entity-types";

/** Stable formation ordinals distinguish identical enemies when reviewing a target. */
export function entityLabel(entity: Entity, participants: Entity[]) {
  const siblings = participants.filter(
    (p) => p.name === entity.name && p.team === entity.team,
  );
  return siblings.length > 1
    ? `${entity.name} ${siblings.findIndex((p) => p.id === entity.id) + 1}`
    : entity.name;
}
