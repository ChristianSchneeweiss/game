import seedrandom from "seedrandom";
import type { Entity } from "@loot-game/game/entity-types";
import type { Spell } from "@loot-game/game/types";
import { Character } from "@loot-game/game/base-entity";
import type { BM } from "@loot-game/game/bm";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import {
  completeSelection,
  targetSelection,
} from "@loot-game/game/spells/base/targets";
import type { BattleMessage } from "./protocol";

type Cast = Extract<BattleMessage, { type: "castSpell" }>["data"];
type TargetRequest = Extract<BattleMessage, { type: "getTargets" }>["data"];

function currentSpell(bm: BM, data: TargetRequest) {
  if (bm.isGameOver()) throw new Error("This battle has finished.");
  if (data.revision !== undefined && data.revision !== bm.events.length) {
    throw new Error("The battle changed. Choose your spell again.");
  }
  if (bm.getCurrentRound().orderQueue[0] !== data.entityId) {
    throw new Error("It is not this character's turn.");
  }
  const entity = bm.getEntityById(data.entityId);
  const spell = entity?.spells.find((s) => s.config.id === data.spellId);
  if (!entity || !spell || !spell.canCast(entity)) {
    throw new Error("This spell is unavailable.");
  }
  return { entity, spell };
}

export function availableSpells(bm: BM) {
  if (bm.isGameOver()) return [];
  const actor = bm.getEntityById(bm.getCurrentRound().orderQueue[0]);
  return (
    actor?.spells.filter((s) => s.canCast(actor)).map((s) => s.config.id) ?? []
  );
}

export function getBattleTargets(bm: BM, data: TargetRequest) {
  const { entity, spell } = currentSpell(bm, data);
  const { targets, enemies, allies, automatic } = targetSelection(
    entity,
    spell,
  );
  return {
    targets: targets.map((t) => t.id),
    enemies,
    allies,
    automatic,
    entityId: entity.id,
    spellId: spell.config.id,
    revision: bm.events.length,
    requestId: data.requestId,
  };
}

/** The authenticated WebSocket command boundary. Validation precedes any RNG or mutation. */
export function castBattleSpell(bm: BM, data: Cast, userId: string) {
  const { entity, spell } = currentSpell(bm, data);
  if (!(entity instanceof Character) || entity.userId !== userId) {
    throw new Error("You can only cast for your own character.");
  }
  const legal = targetSelection(entity, spell);
  const ids = data.targetIds;
  const self = legal.self;
  // Empty self targets remain compatible with existing recorded commands.
  const selection = self && ids.length === 0 ? [entity.id] : ids;
  if (!completeSelection(entity, selection, legal)) {
    throw new Error("Choose the complete legal target set.");
  }
  const result = bm.safeCastSpell(
    entity.id,
    spell.config.id,
    self ? [] : selection,
  );
  if (result === null) throw new Error("The spell was rejected.");
  bm.postTurn();
  if (!bm.isGameOver()) bm.preTurn();
  advanceBots(bm);
}

/** Existing automatic enemy turns, independent of display timing. */
export function advanceBots(bm: BM) {
  // Opening upkeep belongs to the command driver, just like later decisions.
  // BM.preTurn is idempotent while the same turn remains prepared.
  bm.preTurn();
  while (!bm.isGameOver()) {
    const next = bm.getEntityById(bm.getCurrentRound().orderQueue[0]);
    if (!(next instanceof BaseEnemy) || !next.isBot) return;
    const action = next.getAction();
    if (
      bm.safeCastSpell(
        next.id,
        action.spell.config.id,
        action.targets.map((t) => t.id),
      ) === null
    ) {
      throw new Error(`Enemy action rejected: ${next.name}`);
    }
    bm.postTurn();
    if (!bm.isGameOver()) bm.preTurn();
  }
}

/** Tooltip formulas may sample random values; inspect an isolated copy of the RNG. */
export function describeBattleSpell(bm: BM, caster: Entity, spell: Spell) {
  const combatRng = bm.rng;
  bm.rng = seedrandom("", { state: combatRng.state!() });
  try {
    return spell.description(caster);
  } finally {
    bm.rng = combatRng;
  }
}
