import { useEffect, useRef, useState } from "react";
import type { AiControl } from "@loot-game/game/ai-control";
import type { BattleConnection } from "./use-battle-connection";

export function useBattleAi(connection: BattleConnection) {
  const request = useRef<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(
    () =>
      connection.events.on((event) => {
        if (
          event.type === "reset" ||
          ((event.type === "castAccepted" || event.type === "rejected") &&
            event.data.requestId === request.current)
        ) {
          request.current = undefined;
          setPending(false);
          setError(event.type === "rejected" ? event.data.message : undefined);
        }
      }),
    [connection.events],
  );
  return {
    pending,
    error,
    canEdit:
      connection.synchronized &&
      !connection.winner &&
      !connection.abandoned &&
      !pending,
    setControl: (entityId: string, settings: AiControl) => {
      if (!connection.battleState?.ai || pending) return;
      const requestId = crypto.randomUUID();
      request.current = requestId;
      if (
        connection.send({
          type: "setAiControl",
          data: {
            entityId,
            settings,
            requestId,
            controlVersion: connection.battleState.ai.version,
          },
        })
      ) {
        setPending(true);
        setError(undefined);
      }
    },
  };
}
