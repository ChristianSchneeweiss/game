import { TinyEmitter } from "@/utils/tiny-emitter";
import { useUser } from "@clerk/clerk-react";
import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import { useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import SuperJSON from "superjson";
import type {
  BattleMessage,
  BattleState,
  ResponseMessage,
} from "../../../../../server/src/battle/protocol";
import { useAttributes } from "./use-attributes";
import { useSpellDescription } from "./use-spell-description";
import { usePlayback } from "../-presentation/use-playback";

const EMPTY_EVENTS: BattleState["events"] = [];
const EMPTY_EFFECTS: EffectTracking = new Map();
type Targets = Extract<ResponseMessage, { type: "targets" }>["data"];
type Selection = {
  spellId: string;
  requestId: string;
  actorId: string;
  revision: number;
  legal?: Targets;
  chosen: string[];
};

export function useBattle(id: string) {
  const { user } = useUser();
  const [participants, setParticipants] = useState<Entity[]>([]);
  const [battleState, setBattleState] = useState<BattleState>();
  const [selection, updateSelection] = useState<Selection>();
  const selectionRef = useRef<Selection | undefined>(undefined);
  const setSelection = (next: Selection | undefined) => {
    selectionRef.current = next;
    updateSelection(next);
  };
  const [pending, setPending] = useState(false);
  const pendingRef = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string>();
  const [winner, setWinner] = useState<"TEAM_A" | "TEAM_B">();
  const [reset, setReset] = useState(0);
  const needsSnapshot = useRef(true);
  const stateRef = useRef<BattleState | undefined>(undefined);
  const [wsEvents] = useState(() => new TinyEmitter<ResponseMessage>());
  const playback = usePlayback(
    participants,
    battleState?.events ?? EMPTY_EVENTS,
    battleState?.effectTracking ?? EMPTY_EFFECTS,
    reset,
  );
  const clearCommand = () => {
    setSelection(undefined);
    pendingRef.current = undefined;
    setPending(false);
  };
  const { sendMessage, readyState } = useWebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/battle/${id}`,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 15,
      reconnectInterval: 2000,
      retryOnError: true,
      onOpen: () => {
        needsSnapshot.current = true;
        clearCommand();
        setError(undefined);
      },
      onClose: () => {
        clearCommand();
        needsSnapshot.current = true;
        setError(
          "Disconnected. Casting is disabled until the battle resynchronizes.",
        );
      },
      onMessage: (event) => {
        const response = SuperJSON.parse<ResponseMessage>(event.data);
        wsEvents.emit(response);
        switch (response.type) {
          case "entities":
            setParticipants(response.data.entities);
            break;
          case "state": {
            const old = stateRef.current;
            if (needsSnapshot.current) {
              needsSnapshot.current = false;
              setReset((n) => n + 1);
              clearCommand();
            } else if (
              !old ||
              old.revision !== response.data.revision ||
              old.round.orderQueue[0] !== response.data.round.orderQueue[0]
            ) {
              clearCommand();
            }
            stateRef.current = response.data;
            setBattleState(response.data);
            break;
          }
          case "targets": {
            const current = selectionRef.current;
            const data = response.data;
            if (
              !current ||
              data.requestId !== current.requestId ||
              data.spellId !== current.spellId ||
              data.entityId !== current.actorId ||
              data.revision !== current.revision
            )
              break;
            setSelection({
              ...current,
              legal: data,
              chosen: data.automatic ? data.targets : [],
            });
            break;
          }
          case "rejected":
            if (
              response.data.requestId &&
              response.data.requestId !== pendingRef.current &&
              response.data.requestId !== selectionRef.current?.requestId
            )
              break;
            clearCommand();
            setError(response.data.message);
            break;
          // Keep the pending gate until the authoritative state update arrives.
          case "castAccepted":
            break;
          case "finished":
            clearCommand();
            setWinner(response.data.winner);
            break;
        }
      },
    },
  );
  const send = (message: BattleMessage) => {
    if (readyState !== ReadyState.OPEN || needsSnapshot.current) return false;
    sendMessage(SuperJSON.stringify(message), false); // Never queue a command across reconnect.
    return true;
  };
  const sendRead = (message: string) => {
    if (readyState === ReadyState.OPEN) sendMessage(message, false);
  };
  const attributes = useAttributes(sendRead, wsEvents);
  const descriptions = useSpellDescription(sendRead, wsEvents);
  const activeEntity = participants.find(
    (p) => p.id === battleState?.round.orderQueue[0],
  );
  const ownsTurn =
    !!activeEntity &&
    "userId" in activeEntity &&
    activeEntity.userId === user?.id;
  const canChoose =
    readyState === ReadyState.OPEN &&
    !needsSnapshot.current &&
    playback.caughtUp &&
    ownsTurn &&
    !pending &&
    !winner;
  const canCast = !!(
    canChoose &&
    selection?.legal &&
    selection.chosen.length ===
      selection.legal.enemies + selection.legal.allies &&
    selection.chosen.length > 0 &&
    battleState?.availableSpells.includes(selection.spellId)
  );

  const getTargets = (spellId: string) => {
    if (
      !canChoose ||
      !battleState?.availableSpells.includes(spellId) ||
      !activeEntity
    )
      return;
    const requestId = crypto.randomUUID();
    const next = {
      spellId,
      requestId,
      actorId: activeEntity.id,
      revision: battleState.revision,
      chosen: [],
    };
    setError(undefined);
    setSelection(next);
    send({
      type: "getTargets",
      data: {
        entityId: next.actorId,
        spellId,
        requestId,
        revision: next.revision,
      },
    });
    descriptions.getSpellDescription(spellId);
  };
  const setChosenTargets = (ids: string[]) => {
    const current = selectionRef.current;
    if (!canChoose || !current?.legal || current.legal.automatic) return;
    const legal = current.legal;
    const allowed = [...new Set(ids)].filter((id) =>
      legal.targets.includes(id),
    );
    setSelection({
      ...current,
      chosen: allowed.slice(-(legal.enemies + legal.allies)),
    });
  };
  const castSpell = () => {
    const current = selectionRef.current;
    if (!canCast || !current?.legal || pendingRef.current) return;
    const requestId = crypto.randomUUID();
    pendingRef.current = requestId;
    setPending(true);
    if (
      !send({
        type: "castSpell",
        data: {
          entityId: current.actorId,
          spellId: current.spellId,
          targetIds: current.chosen,
          requestId,
          revision: current.revision,
        },
      })
    )
      clearCommand();
  };

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(
      () =>
        setError(
          "Still awaiting the server. Reconnect to resync; the uncertain cast will not be resent.",
        ),
      8000,
    );
    return () => clearTimeout(timer);
  }, [pending]);

  return {
    participants,
    battleState,
    activeEntity,
    ownsTurn,
    canChoose,
    canCast,
    pending,
    error,
    winner,
    readyState,
    playback,
    activeSpell: selection?.spellId ?? null,
    validTargets: selection?.legal?.targets ?? null,
    chosenTargets: selection?.chosen ?? [],
    automaticTargets: selection?.legal?.automatic ?? false,
    getTargets,
    setChosenTargets,
    castSpell,
    cancelSpell: () => setSelection(undefined),
    ...attributes,
    ...descriptions,
  };
}
export type BattleSession = ReturnType<typeof useBattle>;
