import { useUser } from "@clerk/clerk-react";
import type { EffectTracking } from "@loot-game/game/bm";
import type { BattleState } from "../../../../../server/src/battle/protocol";
import { useAttributes } from "./use-attributes";
import { useSpellDescription } from "./use-spell-description";
import { usePlayback } from "../-presentation/use-playback";
import { useBattleConnection } from "./use-battle-connection";
import { useBattleCommands } from "./use-battle-commands";
import { useTacticalCommands } from "./use-tactical-commands";
import { useBattleAi } from "./use-battle-ai";

const EMPTY_EVENTS: BattleState["events"] = [];
const EMPTY_EFFECTS: EffectTracking = new Map();

export function useBattle(id: string) {
  const { user } = useUser();
  const connection = useBattleConnection(id);
  const { participants, battleState } = connection;
  const ai = useBattleAi(connection);
  const playback = usePlayback(
    participants,
    battleState?.events ?? EMPTY_EVENTS,
    battleState?.effectTracking ?? EMPTY_EFFECTS,
    connection.reset,
  );
  const activeEntity = participants.find(
    (entity) => entity.id === battleState?.round.orderQueue[0],
  );
  const ownsTurn =
    !!activeEntity &&
    "userId" in activeEntity &&
    activeEntity.userId === user?.id;
  const legacyCommands = useBattleCommands(
    connection,
    ownsTurn && !battleState?.grid,
    playback.caughtUp,
    activeEntity,
  );
  const tacticalCommands = useTacticalCommands(
    connection,
    ownsTurn &&
      !battleState?.ai?.controls.find(
        (control) => control.entityId === activeEntity?.id,
      )?.enabled,
    playback.caughtUp,
    activeEntity,
    playback.stats,
  );
  const commands = battleState?.grid
    ? tacticalCommands
    : { ...legacyCommands, tactical: undefined };
  const attributes = useAttributes(connection.sendRead, connection.events);
  const descriptions = useSpellDescription(
    connection.sendRead,
    connection.events,
  );

  return {
    participants,
    battleState,
    activeEntity,
    ownsTurn,
    ai,
    playback,
    winner: connection.winner,
    abandoned: connection.abandoned,
    readyState: connection.readyState,
    ...commands,
    error: commands.error ?? connection.error,
    getTargets: (spellId: string) => {
      if (commands.getTargets(spellId))
        descriptions.getSpellDescription(spellId);
    },
    ...attributes,
    ...descriptions,
  };
}
export type BattleSession = ReturnType<typeof useBattle>;
