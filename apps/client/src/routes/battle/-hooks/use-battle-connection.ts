import { TinyEmitter } from "@/utils/tiny-emitter";
import type { Entity } from "@loot-game/game/entity-types";
import { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import SuperJSON from "superjson";
import type {
  BattleMessage,
  BattleState,
  ResponseMessage,
} from "../../../../../server/src/battle/protocol";

export type BattleConnectionEvent = ResponseMessage | { type: "reset" };

/** Owns socket lifetime and committed snapshots; presentation never opens a socket. */
export function useBattleConnection(id: string) {
  const [participants, setParticipants] = useState<Entity[]>([]);
  const [battleState, setBattleState] = useState<BattleState>();
  const [winner, setWinner] = useState<"TEAM_A" | "TEAM_B">();
  const [abandoned, setAbandoned] = useState<string>();
  const [error, setError] = useState<string>();
  const [reset, setReset] = useState(0);
  const [synchronized, setSynchronized] = useState(false);
  const [events] = useState(() => new TinyEmitter<BattleConnectionEvent>());
  const mounted = useRef(true);
  const open = useRef(false);
  const needsSnapshot = useRef(true);
  const finished = useRef(false);
  const stateRef = useRef<BattleState | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      open.current = false;
    };
  }, []);

  const { sendMessage, readyState } = useWebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/battle/${id}`,
    {
      shouldReconnect: () => mounted.current && !finished.current,
      reconnectAttempts: 15,
      reconnectInterval: 2000,
      retryOnError: true,
      onOpen: () => {
        if (!mounted.current || finished.current) return;
        open.current = true;
        needsSnapshot.current = true;
        setSynchronized(false);
        events.emit({ type: "reset" });
        setError(undefined);
      },
      onClose: () => {
        open.current = false;
        needsSnapshot.current = true;
        if (!mounted.current || finished.current) return;
        setSynchronized(false);
        events.emit({ type: "reset" });
        setError(
          "Disconnected. Casting is disabled until the battle resynchronizes.",
        );
      },
      onMessage: (event) => {
        if (!mounted.current || !open.current || finished.current) return;
        const response = SuperJSON.parse<ResponseMessage>(event.data);
        switch (response.type) {
          case "entities":
            setParticipants(response.data.entities);
            break;
          case "state": {
            const old = stateRef.current;
            // A delayed snapshot cannot rewind committed state, even on reconnect.
            if (
              old &&
              (response.data.revision < old.revision ||
                (response.data.ai?.version ?? 0) < (old.ai?.version ?? 0))
            )
              return;
            if (needsSnapshot.current) {
              needsSnapshot.current = false;
              setSynchronized(true);
              setReset((value) => value + 1);
              events.emit({ type: "reset" });
            } else if (
              !old ||
              old.revision !== response.data.revision ||
              old.ai?.version !== response.data.ai?.version ||
              old.round.orderQueue[0] !== response.data.round.orderQueue[0]
            ) {
              events.emit({ type: "reset" });
            }
            stateRef.current = response.data;
            setBattleState(response.data);
            break;
          }
          case "finished":
            finished.current = true;
            events.emit({ type: "reset" });
            setWinner(response.data.winner);
            break;
          case "abandoned":
            finished.current = true;
            needsSnapshot.current = true;
            setSynchronized(false);
            setAbandoned(response.data.dungeonId);
            events.emit({ type: "reset" });
            break;
        }
        events.emit(response);
      },
    },
  );

  const send = (message: BattleMessage) => {
    if (
      !mounted.current ||
      !open.current ||
      needsSnapshot.current ||
      finished.current
    )
      return false;
    sendMessage(SuperJSON.stringify(message), false);
    return true;
  };
  const sendRead = (message: string) => {
    if (mounted.current && open.current && !finished.current)
      sendMessage(message, false);
  };

  return {
    participants,
    battleState,
    winner,
    abandoned,
    error,
    reset,
    synchronized,
    readyState,
    events,
    send,
    sendRead,
  };
}

export type BattleConnection = ReturnType<typeof useBattleConnection>;
