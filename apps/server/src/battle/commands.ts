import seedrandom from "seedrandom";
import { restorationAmount } from "@loot-game/game/items/consumables";
import type { Entity } from "@loot-game/game/entity-types";
import type { Spell } from "@loot-game/game/types";
import { Character } from "@loot-game/game/base-entity";
import { MANUAL_CONTROL } from "@loot-game/game/ai-control";
import type { BM } from "@loot-game/game/bm";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import {
  completeSelection,
  targetSelection,
} from "@loot-game/game/spells/base/targets";
import type { BattleMessage } from "./protocol";
import type { BattleCommand, GridCommand } from "./protocol";
import { planEnemyTurn } from "@loot-game/game/tactical/ai";

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

export function availableConsumables(bm: BM) {
  if (!bm.grid || bm.isGameOver()) return [];
  const actor = bm.getEntityById(bm.getCurrentRound().orderQueue[0]);
  return (actor?.consumables ?? []).map((item) => ({
    ...item,
    available:
      item.quantity > 0 &&
      !!actor &&
      restorationAmount(item.restoration, actor) > 0,
  }));
}

export function aiControls(bm: BM, userId?: string) {
  return bm.entities.map((entity) => ({
    entityId: entity.id,
    enabled: entity.aiControl?.enabled ?? false,
    ...(entity instanceof Character && entity.userId === userId
      ? {
          settings: entity.aiControl ?? { ...MANUAL_CONTROL },
          failure: entity.aiFailure,
        }
      : {}),
  }));
}

export function getBattleTargets(bm: BM, data: TargetRequest) {
  if (bm.grid) throw new Error("Use tactical targeting for this battle.");
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
  if (bm.grid) throw new Error("This battle requires a spatial cast.");
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

export function battleRevision(bm: BM) {
  return bm.grid ? bm.revision : bm.events.length;
}

/** Owner and freshness checks are shared by all grid mutations, before rule evaluation. */
export function validateGridCommandIdentity(
  bm: BM,
  command: GridCommand,
  userId: string,
) {
  const data = command.data;
  const entity = bm.getEntityById(data.entityId);
  if (!(entity instanceof Character) || entity.userId !== userId)
    throw new Error("You can only act for your own character.");
  if (entity.aiControl?.enabled)
    throw new Error("Take over from Commander before choosing an action.");
  if (!bm.grid || bm.isGameOver())
    throw new Error("This tactical battle is unavailable.");
  if (data.revision !== bm.revision)
    throw new Error("The battle changed. Choose your action again.");
  if (
    bm.grid.activation?.id !== data.activationId ||
    bm.grid.activation.entityId !== data.entityId
  )
    throw new Error("It is not this character's activation.");
}

export function applyGridCommand(bm: BM, command: GridCommand, userId: string) {
  validateGridCommandIdentity(bm, command, userId);
  const data = command.data;
  switch (command.type) {
    case "useConsumable":
      if (!bm.useConsumable(data.entityId, command.data.slot))
        throw new Error("This bottle is empty or would restore no resources.");
      break;
    case "move":
      if (!bm.moveEntity(data.entityId, command.data.destination))
        throw new Error("That destination is unavailable.");
      return;
    case "castSpatial":
      if (
        bm.safeCastSpatial(
          data.entityId,
          command.data.spellId,
          command.data.selection,
        ) === null
      )
        throw new Error("The spell was rejected.");
      break;
    case "endTurn":
      if (!bm.passTurn(data.entityId))
        throw new Error("The turn cannot be ended.");
      break;
  }
  bm.postTurn();
  if (!bm.isGameOver()) bm.preTurn();
  advanceBots(bm);
}

export function applyBattleCommand(
  bm: BM,
  command: BattleCommand,
  userId: string,
) {
  if (command.type === "setAiControl") {
    const actor = bm.getEntityById(command.data.entityId);
    if (!(actor instanceof Character) || actor.userId !== userId)
      throw new Error("You can only change your own character's controls.");
    if (!bm.grid || bm.isGameOver())
      throw new Error("This tactical battle is unavailable.");
    actor.aiControl = { ...command.data.settings };
    actor.aiFailure = undefined;
  } else if (command.type === "castSpell")
    castBattleSpell(bm, command.data, userId);
  else applyGridCommand(bm, command, userId);
}

/** Existing automatic enemy turns, independent of display timing. */
export function advanceBots(bm: BM) {
  // Opening upkeep belongs to the command driver, just like later decisions.
  // BM.preTurn is idempotent while the same turn remains prepared.
  bm.preTurn();
  while (!bm.isGameOver()) {
    const next = bm.getEntityById(bm.getCurrentRound().orderQueue[0]);
    if (bm.grid && next?.aiControl?.enabled) return;
    if (!(next instanceof BaseEnemy) || !next.isBot) return;
    if (bm.grid) {
      const plan = planEnemyTurn(bm);
      if (plan.destination && !bm.moveEntity(next.id, plan.destination))
        throw new Error(`Enemy movement rejected: ${next.name}`);
      if (plan.spellId && plan.selection) {
        if (bm.safeCastSpatial(next.id, plan.spellId, plan.selection) === null)
          throw new Error(`Enemy spatial action rejected: ${next.name}`);
      } else if (!bm.passTurn(next.id))
        throw new Error(`Enemy pass rejected: ${next.name}`);
      bm.postTurn();
      if (!bm.isGameOver()) bm.preTurn();
      continue;
    }
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
