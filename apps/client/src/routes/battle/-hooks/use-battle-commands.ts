import type { Entity } from "@loot-game/game/entity-types";
import { useEffect, useRef, useState } from "react";
import type {
  BattleState,
  ResponseMessage,
} from "../../../../../server/src/battle/protocol";
import type { BattleConnection } from "./use-battle-connection";

type Targets = Extract<ResponseMessage, { type: "targets" }>["data"];
type Selection = {
  spellId: string;
  requestId: string;
  actorId: string;
  revision: number;
  legal?: Targets;
  chosen: string[];
};
type PreparedCommand = {
  selection?: Selection;
  pendingId?: string;
  error?: string;
};

function castReady(
  selection: Selection | undefined,
  state: BattleState | undefined,
) {
  return !!(
    selection?.legal &&
    state &&
    selection.revision === state.revision &&
    selection.actorId === state.round.orderQueue[0] &&
    selection.chosen.length > 0 &&
    selection.chosen.length ===
      selection.legal.enemies + selection.legal.allies &&
    state.availableSpells.includes(selection.spellId)
  );
}

/** Selection, target-response correlation and the uncertain-command gate share one owner. */
export function useBattleCommands(
  connection: BattleConnection,
  ownsTurn: boolean,
  caughtUp: boolean,
  activeEntity: Entity | undefined,
) {
  const [command, updateCommand] = useState<PreparedCommand>({});
  const commandRef = useRef(command);
  const setCommand = (next: PreparedCommand) => {
    commandRef.current = next;
    updateCommand(next);
  };
  const { events, battleState } = connection;
  useEffect(
    () =>
      events.on((response) => {
        const current = commandRef.current;
        switch (response.type) {
          case "reset":
            setCommand({});
            break;
          case "targets": {
            const selection = current.selection;
            const data = response.data;
            if (
              !selection ||
              data.requestId !== selection.requestId ||
              data.spellId !== selection.spellId ||
              data.entityId !== selection.actorId ||
              data.revision !== selection.revision ||
              current.pendingId
            )
              return;
            setCommand({
              ...current,
              selection: {
                ...selection,
                legal: data,
                chosen: data.automatic ? data.targets : [],
              },
            });
            break;
          }
          case "rejected":
            if (
              response.data.requestId &&
              response.data.requestId !== current.pendingId &&
              response.data.requestId !== current.selection?.requestId
            )
              return;
            setCommand({ error: response.data.message });
            break;
          // An acknowledgement alone does not unlock a second command.
          case "castAccepted":
            break;
        }
      }),
    [events],
  );

  const pending = !!command.pendingId;
  const canChoose =
    connection.synchronized &&
    caughtUp &&
    ownsTurn &&
    !pending &&
    !connection.abandoned &&
    !connection.winner;
  const canCast = canChoose && castReady(command.selection, battleState);

  const getTargets = (spellId: string) => {
    if (
      !canChoose ||
      commandRef.current.pendingId ||
      !activeEntity ||
      !battleState?.availableSpells.includes(spellId)
    )
      return false;
    const selection: Selection = {
      spellId,
      requestId: crypto.randomUUID(),
      actorId: activeEntity.id,
      revision: battleState.revision,
      chosen: [],
    };
    setCommand({ selection });
    if (
      !connection.send({
        type: "getTargets",
        data: {
          entityId: selection.actorId,
          spellId,
          requestId: selection.requestId,
          revision: selection.revision,
        },
      })
    ) {
      setCommand({});
      return false;
    }
    return true;
  };
  const setChosenTargets = (ids: string[]) => {
    const current = commandRef.current;
    const selection = current.selection;
    if (
      !canChoose ||
      current.pendingId ||
      !selection?.legal ||
      selection.legal.automatic
    )
      return;
    const legal = selection.legal;
    const allowed = [...new Set(ids)].filter((id) =>
      legal.targets.includes(id),
    );
    setCommand({
      ...current,
      selection: {
        ...selection,
        chosen: allowed.slice(-(legal.enemies + legal.allies)),
      },
    });
  };
  const castSpell = () => {
    const current = commandRef.current;
    const selection = current.selection;
    if (
      !canChoose ||
      current.pendingId ||
      !castReady(selection, battleState) ||
      !selection
    )
      return;
    const requestId = crypto.randomUUID();
    setCommand({ ...current, pendingId: requestId });
    if (
      !connection.send({
        type: "castSpell",
        data: {
          entityId: selection.actorId,
          spellId: selection.spellId,
          targetIds: selection.chosen,
          requestId,
          revision: selection.revision,
        },
      })
    )
      setCommand({});
  };
  const cancelSpell = () => {
    if (!commandRef.current.pendingId) setCommand({});
  };

  useEffect(() => {
    if (!command.pendingId) return;
    const timer = window.setTimeout(() => {
      if (commandRef.current.pendingId !== command.pendingId) return;
      setCommand({
        ...commandRef.current,
        error:
          "Still awaiting the server. Reconnect to resync; the uncertain cast will not be resent.",
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, [command.pendingId]);

  return {
    canChoose,
    canCast,
    pending,
    error: command.error,
    activeSpell: command.selection?.spellId ?? null,
    validTargets: command.selection?.legal?.targets ?? null,
    chosenTargets: command.selection?.chosen ?? [],
    automaticTargets: command.selection?.legal?.automatic ?? false,
    getTargets,
    setChosenTargets,
    castSpell,
    cancelSpell,
  };
}
