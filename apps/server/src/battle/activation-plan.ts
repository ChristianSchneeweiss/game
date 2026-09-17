import { z } from "zod";
import type { BM } from "@loot-game/game/bm";
import {
  CastSelectionSchema,
  TileSchema,
} from "@loot-game/game/tactical/types";
import { reachableTiles, sameTile } from "@loot-game/game/tactical/queries";
import { ConsumableSlotSchema } from "@loot-game/game/items/consumables";
import { planEnemyTurn } from "@loot-game/game/tactical/ai";

export const ActionPlanSchema = z.strictObject({
  destination: TileSchema.nullable(),
  action: z.discriminatedUnion("type", [
    z.strictObject({
      type: z.literal("cast"),
      spellId: z.string().min(1),
      selection: CastSelectionSchema,
    }),
    z.strictObject({
      type: z.literal("consumable"),
      slot: ConsumableSlotSchema,
    }),
    z.strictObject({ type: z.literal("endTurn") }),
  ]),
});
export type ActionPlan = z.infer<typeof ActionPlanSchema>;

/** All legality checks are read-only, including the follow-up at the proposed tile. */
export function validateActivationPlan(
  bm: BM,
  entityId: string,
  plan: ActionPlan,
) {
  ActionPlanSchema.parse(plan);
  const grid = bm.grid;
  const actor = bm.getEntityById(entityId);
  if (
    !grid?.activation ||
    grid.activation.entityId !== entityId ||
    bm.getCurrentRound().orderQueue[0] !== entityId ||
    bm.isGameOver() ||
    !actor ||
    actor.isDead() ||
    actor.activeEffects.some((e) => e.preventsAction)
  )
    throw new Error("This activation is unavailable.");
  const { destination, action } = plan;
  let projected = grid;
  if (destination) {
    const move = reachableTiles(
      grid,
      bm.entities,
      entityId,
      grid.activation.allowance - grid.activation.spent,
    ).find(({ tile }) => sameTile(tile, destination));
    if (!move?.path.length) throw new Error("AI chose an invalid movement.");
    projected = {
      ...grid,
      positions: { ...grid.positions, [entityId]: move.tile },
    };
  }
  if (
    action.type === "cast" &&
    !bm.canCastSpatial(entityId, action.spellId, action.selection, projected)
  )
    throw new Error("AI chose an unavailable spell or target.");
  if (
    action.type === "consumable" &&
    (actor.aiControl?.allowConsumables === false ||
      !bm.canUseConsumable(entityId, action.slot))
  )
    throw new Error("AI chose an unavailable consumable.");
}

/** Called on a disposable candidate; only its persisted journal makes it live. */
export function applyActivationPlan(
  bm: BM,
  entityId: string,
  plan: ActionPlan,
) {
  validateActivationPlan(bm, entityId, plan);
  if (plan.destination && !bm.moveEntity(entityId, plan.destination))
    throw new Error("AI movement was rejected.");
  const action = plan.action;
  const accepted =
    action.type === "cast"
      ? bm.safeCastSpatial(entityId, action.spellId, action.selection) !== null
      : action.type === "consumable"
        ? bm.useConsumable(entityId, action.slot)
        : bm.passTurn(entityId);
  if (!accepted) throw new Error("AI action was rejected.");
  bm.postTurn();
  if (!bm.isGameOver()) bm.preTurn();
}

export function deterministicPlan(bm: BM): ActionPlan {
  const plan = planEnemyTurn(bm);
  return {
    destination: plan.destination ?? null,
    action:
      plan.spellId && plan.selection
        ? { type: "cast", spellId: plan.spellId, selection: plan.selection }
        : { type: "endTurn" },
  };
}
