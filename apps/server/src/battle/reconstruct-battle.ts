import { Character } from "@loot-game/game/base-entity";
import { BM } from "@loot-game/game/bm";
import SuperJSON from "superjson";
import { advanceBots, applyBattleCommand } from "./commands";
import { isBattleCommand, messageSchema } from "./protocol";
import type { GridSetup } from "@loot-game/game/tactical/types";
import { restoreStartingBuilds, type StartingBuilds } from "./starting-builds";

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
    const command = messageSchema.parse(SuperJSON.parse(message));
    if (!isBattleCommand(command))
      throw new Error("Unexpected command in battle journal");
    const actor = battle.getEntityById(command.data.entityId);
    if (!(actor instanceof Character))
      throw new Error("Battle journal actor is not a character");
    applyBattleCommand(battle, command, actor.userId);
  }
  return battle;
}
