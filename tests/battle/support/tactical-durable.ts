import SuperJSON from "superjson";
import type { BM } from "../../../apps/game/src/bm";
import type { GridSetup } from "../../../apps/game/src/tactical/types";
import type { GridCommand } from "../../../apps/server/src/battle/protocol";
import {
  captureStartingBuilds,
  restoreStartingBuilds,
  type StartingBuilds,
} from "../../../apps/server/src/battle/starting-builds";
import type { Database } from "../../../apps/server/src/db/schema";
import { sharedDurable } from "./shared-durable";
export { tacticalState } from "./tactical-state";

type TacticalAction =
  | { type: "move"; destination: { x: number; y: number } }
  | { type: "endTurn" }
  | {
      type: "castSpatial";
      spellId: string;
      selection: Extract<
        GridCommand,
        { type: "castSpatial" }
      >["data"]["selection"];
    };

/** Existing real DO harness, with an explicit v2 frozen starting snapshot. */
export async function tacticalDurable(
  db: Database,
  prepare?: (builds: StartingBuilds, grid: GridSetup, env: Env) => void,
) {
  const fixture = await sharedDurable(db);
  const builds = captureStartingBuilds(
    restoreStartingBuilds(
      fixture.storage.get("startingBuilds") as StartingBuilds,
    ),
    true,
  );
  const grid: GridSetup = {
    rulesVersion: 2,
    battlefield: {
      width: 11,
      height: 9,
      blocked: [{ x: 2, y: 1 }],
      layoutVersion: "test-rectangle-v1",
    },
    positions: {
      "audit-hero": { x: 1, y: 1 },
      "guest-hero": { x: 0, y: 1 },
      "audit-goblin": { x: 6, y: 1 },
    },
  };
  prepare?.(builds, grid, fixture.env);
  fixture.storage.set(
    "startingBuilds",
    captureStartingBuilds(restoreStartingBuilds(builds), true),
  );
  fixture.storage.set("startingGrid", grid);
  fixture.storage.set("journalVersion", 2);
  const socket = await fixture.rehydrate();
  let requests = 0;
  function command(
    action: Extract<TacticalAction, { type: "move" }>,
    battle?: BM,
  ): Extract<GridCommand, { type: "move" }>;
  function command(
    action: Extract<TacticalAction, { type: "endTurn" }>,
    battle?: BM,
  ): Extract<GridCommand, { type: "endTurn" }>;
  function command(
    action: Extract<TacticalAction, { type: "castSpatial" }>,
    battle?: BM,
  ): Extract<GridCommand, { type: "castSpatial" }>;
  function command(
    action: TacticalAction,
    battle: BM = socket.bm,
  ): GridCommand {
    const activation = battle.grid!.activation!;
    const identity = {
      entityId: activation.entityId,
      activationId: activation.id,
      revision: battle.revision,
      requestId: `tactical-${++requests}`,
    };
    switch (action.type) {
      case "move":
        return {
          type: "move",
          data: { ...identity, destination: action.destination },
        };
      case "castSpatial":
        return {
          type: "castSpatial",
          data: {
            ...identity,
            spellId: action.spellId,
            selection: action.selection,
          },
        };
      case "endTurn":
        return { type: "endTurn", data: identity };
    }
  }
  return {
    ...fixture,
    socket,
    command,
    send: async (command: GridCommand, owner = 0, target = socket) => {
      await target.webSocketMessage(
        fixture.sockets[owner]!,
        SuperJSON.stringify(command),
      );
    },
  };
}
