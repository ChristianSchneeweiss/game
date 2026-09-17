import { Character } from "@loot-game/game/base-entity";
import { BM } from "@loot-game/game/bm";
import SuperJSON from "superjson";
import { advanceBots, applyBattleCommand } from "./commands";
import { isBattleCommand, messageSchema } from "./protocol";
import type { GridSetup } from "@loot-game/game/tactical/types";
import { restoreStartingBuilds, type StartingBuilds } from "./starting-builds";
import { z } from "zod";
import { ActionPlanSchema, applyActivationPlan } from "./activation-plan";

export const journalSchema = z.union([
  messageSchema,
  z.strictObject({
    type: z.literal("aiAction"),
    data: z.strictObject({
      entityId: z.string(),
      activationId: z.string(),
      revision: z.int(),
      source: z.enum(["model", "fallback"]),
      plan: ActionPlanSchema,
    }),
  }),
  z.strictObject({
    type: z.literal("aiFailure"),
    data: z.strictObject({ entityId: z.string(), reason: z.string() }),
  }),
]);
export type JournalEntry = z.infer<typeof journalSchema>;

export function applyJournalEntry(battle: BM, command: JournalEntry) {
  if (command.type === "aiAction") {
    if (
      battle.grid?.activation?.id !== command.data.activationId ||
      battle.revision !== command.data.revision
    )
      throw new Error("AI journal activation changed.");
    applyActivationPlan(battle, command.data.entityId, command.data.plan);
    advanceBots(battle);
    return;
  }
  if (command.type !== "aiFailure" && !isBattleCommand(command))
    throw new Error("Unexpected command in battle journal");
  const actor = battle.getEntityById(command.data.entityId);
  if (!(actor instanceof Character))
    throw new Error("Battle journal actor is not a character");
  if (command.type === "aiFailure") {
    if (!actor.aiControl) throw new Error("Missing AI control settings");
    actor.aiControl.enabled = false;
    actor.aiFailure = command.data.reason;
    return;
  }
  applyBattleCommand(battle, command, actor.userId);
}

/** Replay only the authenticated command prefix committed by this object. */
export function reconstructBattle(
  battleId: string,
  builds: StartingBuilds,
  messages: string[],
  grid?: GridSetup,
): BM {
  const battle = new BM(restoreStartingBuilds(builds), battleId, grid);
  battle.start();
  advanceBots(battle);
  for (const message of messages) {
    const command = journalSchema.parse(SuperJSON.parse(message));
    applyJournalEntry(battle, command);
  }
  return battle;
}
