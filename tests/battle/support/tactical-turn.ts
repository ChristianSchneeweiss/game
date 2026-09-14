import type { BM } from "../../../apps/game/src/bm";
import { planEnemyTurn } from "../../../apps/game/src/tactical/ai";
import { legalSelections } from "../../../apps/game/src/tactical/queries";
import {
  advanceBots,
  applyGridCommand,
} from "../../../apps/server/src/battle/commands";

/** Real authoritative player commands for production encounter/progression fixtures. */
export function playTacticalTurn(battle: BM, owner: string, pass = false) {
  advanceBots(battle);
  if (battle.isGameOver()) return;
  const identity = () => ({
    entityId: battle.grid!.activation!.entityId,
    activationId: battle.grid!.activation!.id,
    revision: battle.revision,
    requestId: `turn-fixture-${battle.revision}`,
  });
  const plan = pass ? {} : planEnemyTurn(battle);
  if (plan.destination)
    applyGridCommand(
      battle,
      { type: "move", data: { ...identity(), destination: plan.destination } },
      owner,
    );
  const actor = battle.getEntityById(battle.grid!.activation!.entityId)!;
  // These progression fixtures equip this damaging spell so their wins do not depend on balance.
  const preferred = actor.spells.find(
    (spell) =>
      spell.config.type === "bladestorm-rhythm" && spell.canCast(actor),
  );
  const preferredAim =
    preferred?.config.targeting && !pass
      ? legalSelections(
          battle.grid!,
          battle.entities,
          actor.id,
          preferred.config.targeting,
        )[0]
      : undefined;
  const spellId = preferredAim ? preferred!.config.id : plan.spellId;
  const selection = preferredAim ?? plan.selection;
  applyGridCommand(
    battle,
    spellId && selection
      ? { type: "castSpatial", data: { ...identity(), spellId, selection } }
      : { type: "endTurn", data: identity() },
    owner,
  );
}
