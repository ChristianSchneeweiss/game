import seedrandom from "seedrandom";
import type { BM } from "@loot-game/game/bm";
import { readCombatAttributes } from "@loot-game/game/combat-attributes";
import {
  reachableTiles,
  legalSelections,
} from "@loot-game/game/tactical/queries";

/** Current inspection data only. Definitions are shared; no history, prompts or inventory. */
export function battleAiSnapshot(bm: BM) {
  const grid = bm.grid;
  const activation = grid?.activation;
  const actor = activation && bm.getEntityById(activation.entityId);
  if (!grid || !activation || !actor)
    throw new Error("No actionable activation.");
  const rng = bm.rng;
  bm.rng = seedrandom("", { state: rng.state!() });
  try {
    const definitions: Record<string, unknown> = {};
    const keys = new Map<string, string>();
    const definition = (value: unknown) => {
      const key = JSON.stringify(value);
      let id = keys.get(key);
      if (!id) {
        id = `d${keys.size}`;
        keys.set(key, id);
        definitions[id] = value;
      }
      return id;
    };
    const entities = bm.entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      team: entity.team,
      health: entity.health,
      maxHealth: entity.maxHealth,
      mana: entity.mana,
      maxMana: entity.maxMana,
      attributes: readCombatAttributes(entity),
      effects: entity.activeEffects.map((effect) => ({
        definition: definition({
          type: effect.effectType,
          description: effect.getDescription(),
        }),
        duration: effect.duration,
        clock: effect.clock,
        preventsAction: effect.preventsAction,
        sourceId: effect.sourceId,
      })),
      ...(entity.team === actor.team
        ? {
            spells: entity.spells.map((spell) => ({
              id: spell.config.id,
              definition: definition({
                name: spell.config.name,
                description: spell.description(entity).text,
                manaCost: spell.config.manaCost,
                cooldown: spell.config.cooldown,
                targeting: spell.config.targeting,
              }),
              cooldownRemaining: spell.currentCooldown,
              available: spell.canCast(entity),
            })),
            passives: entity.passiveSkills.map((passive) =>
              definition({
                type: passive.effectType,
                description: passive.getDescription(),
              }),
            ),
            weaponAttack: entity.weaponAttackProfile,
            consumables: (entity.consumables ?? []).map(
              ({ slot, name, quantity, restoration }) => ({
                slot,
                name,
                quantity,
                restoration,
              }),
            ),
          }
        : {}),
    }));
    return {
      actorId: actor.id,
      team: actor.team,
      round: bm.getCurrentRound().round,
      turnOrder: [...bm.getCurrentRound().orderQueue],
      activation: { ...activation },
      movementRemaining: activation.allowance - activation.spent,
      battlefield: structuredClone(grid.battlefield),
      positions: structuredClone(grid.positions),
      allowConsumables: actor.aiControl?.allowConsumables !== false,
      reachable: reachableTiles(
        grid,
        bm.entities,
        actor.id,
        activation.allowance - activation.spent,
      ).map(({ tile, path }) => ({ tile, steps: path.length })),
      targetsFromCurrentPosition: actor.spells
        .filter((spell) => spell.canCast(actor) && spell.config.targeting)
        .map((spell) => ({
          spellId: spell.config.id,
          selections: legalSelections(
            grid,
            bm.entities,
            actor.id,
            spell.config.targeting!,
          ),
        })),
      entities,
      definitions,
    };
  } finally {
    bm.rng = rng;
  }
}

export type AiSnapshot = ReturnType<typeof battleAiSnapshot>;
