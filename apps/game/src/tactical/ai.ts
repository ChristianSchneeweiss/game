import type { BM } from "../bm";
import type { Entity } from "../entity-types";
import type { Spell } from "../types";
import { legalCastQueries, legalSelections, reachableTiles } from "./queries";
import type { CastSelection, GridSetup, Tile } from "./types";

export type EnemyTurnPlan = {
  destination?: Tile;
  spellId?: string;
  selection?: CastSelection;
};
const HEALS = new Set([
  "single-heal",
  "ocean-blessing",
  "natures-embrace",
  "stream-of-life",
]);
const CONTROL = new Set([
  "crude-strike",
  "festering-blow",
  "splinter-shot",
  "cinderbrand",
  "charred-chains",
  "crushing-blow",
  "rootgrasp",
  "verdant-smite",
  "lightning-surge",
  "stunning-strike",
  "staggering-jab",
  "battle-roar",
  "torrent-spiral",
  "aqua-wave",
  "tidal-pulse",
  "rupture",
  "bulwark-bash",
  "earthshatter",
]);

/** Deliberately heuristic: score useful recipients without simulating damage or sampling combat RNG. */
function utility(actor: Entity, spell: Spell, recipients: Entity[]): number {
  if (spell.config.targeting?.recipients === "enemies") {
    return recipients.reduce((score, target) => {
      const damage = spell.estimateDamage?.(actor, target) ?? 0;
      const applied = target.activeEffects.some(
        (effect) =>
          effect.sourceId === actor.id &&
          effect.origin.kind === "spell" &&
          effect.origin.id === spell.config.id,
      );
      const control = CONTROL.has(spell.config.type) && !applied ? 4 : 0;
      return (
        score +
        Math.min(target.health, damage) +
        (damage >= target.health ? 10 : 0) +
        control
      );
    }, 0);
  }
  return recipients.reduce((score, target) => {
    if (spell.config.type === "iron-will") {
      const cleanse = target.activeEffects.some((effect) =>
        ["DEBUFF", "DOT", "CURSE", "STUN"].includes(effect.effectType),
      );
      const healing = target.health / target.maxHealth < 0.3 ? 40 : 0;
      const applied = target.activeEffects.some(
        (effect) =>
          effect.sourceId === actor.id &&
          effect.origin.kind === "spell" &&
          effect.origin.id === spell.config.id,
      );
      return score + healing + (cleanse ? 15 : 0) + (applied ? 0 : 5);
    }
    if (HEALS.has(spell.config.type)) {
      const deficit = Math.max(0, 1 - target.health / target.maxHealth);
      return score + (deficit > 0.15 ? deficit * 60 : 0);
    }
    const alreadyApplied = target.activeEffects.some(
      (effect) =>
        effect.sourceId === actor.id &&
        effect.origin.kind === "spell" &&
        effect.origin.id === spell.config.id,
    );
    return score + (alreadyApplied ? 0 : 5);
  }, 0);
}

/** Shared with deterministic test drivers; the server calls this only for the active bot. */
export function planEnemyTurn(bm: BM): EnemyTurnPlan {
  const grid = bm.grid;
  const activation = grid?.activation;
  if (!grid || !activation || bm.isGameOver()) return {};
  const actor = bm.getEntityById(activation.entityId);
  if (
    !actor ||
    actor.isDead() ||
    actor.activeEffects.some((effect) => effect.preventsAction)
  )
    return {};
  const allowance = Math.max(0, activation.allowance - activation.spent);
  const destinations = reachableTiles(grid, bm.entities, actor.id, allowance);
  const spells = actor.spells.filter(
    (spell) => spell.config.targeting && spell.canCast(actor),
  );
  let best: { score: number; steps: number; plan: EnemyTurnPlan } | undefined;
  for (const destination of destinations) {
    const projected: GridSetup = {
      ...grid,
      positions: { ...grid.positions, [actor.id]: destination.tile },
    };
    for (const spell of spells) {
      if (destination.path.length && spell.config.targeting!.aim === "global")
        continue;
      for (const result of legalCastQueries(
        projected,
        bm.entities,
        actor.id,
        spell.config.targeting!,
      )) {
        const { selection } = result;
        const recipients = result.recipientIds.map(
          (id) => bm.getEntityById(id)!,
        );
        const score = utility(actor, spell, recipients);
        if (
          score <= 0 ||
          (best &&
            (score < best.score ||
              (score === best.score && destination.path.length >= best.steps)))
        )
          continue;
        best = {
          score,
          steps: destination.path.length,
          plan: {
            ...(destination.path.length
              ? { destination: destination.tile }
              : {}),
            spellId: spell.config.id,
            selection,
          },
        };
      }
    }
  }
  if (best) return best.plan;

  // Search navigable attack positions, rather than trying to walk onto an occupied victim.
  const attacks = spells.filter(
    (spell) => spell.config.targeting?.recipients === "enemies",
  );
  if (!allowance || !attacks.length) return {};
  const future = reachableTiles(
    grid,
    bm.entities,
    actor.id,
    grid.battlefield.width * grid.battlefield.height,
  );
  for (const destination of future) {
    if (destination.path.length <= allowance) continue;
    const projected: GridSetup = {
      ...grid,
      positions: { ...grid.positions, [actor.id]: destination.tile },
    };
    if (
      attacks.some(
        (spell) =>
          legalSelections(
            projected,
            bm.entities,
            actor.id,
            spell.config.targeting!,
          ).length,
      )
    ) {
      return { destination: destination.path[allowance - 1]! };
    }
  }
  return {};
}
