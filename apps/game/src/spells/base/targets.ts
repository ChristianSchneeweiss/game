import type { Entity } from "../../entity-types";
import type { Spell, TargetType } from "../../types";

/** Eligibility is a read-only query; selecting a random target is a separate step. */
export function legalTargets(
  caster: Entity,
  entities: readonly Entity[],
  type: TargetType,
): Entity[] {
  if (caster.isDead()) return [];
  if (type.enemies === 0 && type.allies === 0) return [caster];
  return entities.filter(
    (target) =>
      !target.isDead() &&
      (target.team === caster.team ? type.allies > 0 : type.enemies > 0),
  );
}

export const livingEnemies = (caster: Entity) =>
  legalTargets(caster, caster.battleManager.entities, {
    enemies: Infinity,
    allies: 0,
  });

export const canResolveImpact = (caster: Entity, target: Entity) =>
  !caster.isDead() && !target.isDead();

/** A delayed action keeps its original selection and resolves surviving members. */
export function survivingTargets(
  caster: Entity,
  targets: readonly Entity[],
  spell: Spell,
) {
  const allowed = new Set(spell.getValidTargets(caster));
  return targets.filter((target) => allowed.has(target));
}

export function targetSelection(caster: Entity, spell: Spell) {
  const type = spell.getTargetType();
  const self = type.enemies === 0 && type.allies === 0;
  const targets = spell.getValidTargets(caster);
  const enemies = Math.min(
    type.enemies,
    targets.filter((target) => target.team !== caster.team).length,
  );
  const allies = self
    ? 1
    : Math.min(
        type.allies,
        targets.filter((target) => target.team === caster.team).length,
      );
  return {
    targets,
    enemies,
    allies,
    self,
    automatic: self || enemies + allies === targets.length,
  };
}

export function completeSelection(
  caster: Entity,
  ids: readonly string[],
  selection: ReturnType<typeof targetSelection>,
) {
  const allowed = new Map(
    selection.targets.map((target) => [target.id, target]),
  );
  return (
    new Set(ids).size === ids.length &&
    ids.length === selection.enemies + selection.allies &&
    ids.every((id) => allowed.has(id)) &&
    ids.filter((id) => allowed.get(id)?.team === caster.team).length ===
      selection.allies
  );
}
