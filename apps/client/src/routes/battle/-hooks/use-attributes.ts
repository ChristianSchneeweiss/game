import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import type z from "zod";
import type {
  messageSchema,
  ResponseMessage,
} from "../../../../../server/src/battle-ws";

export const useAttributes = (ws: WebSocket) => {
  const queryClient = useQueryClient();
  const [characterId, setCharacterId] = useState<string | null>(null);

  useEffect(() => {
    if (!ws || !characterId) return;

    const listener = (event: MessageEvent) => {
      const response = SuperJSON.parse(event.data) as ResponseMessage;
      if (response.type === "characterAttributes") {
        queryClient.setQueryData(
          ["attributes", characterId],
          response.data.attributes,
        );
      }
    };

    ws.onmessage = listener;
    return () => {
      ws.onmessage = null;
    };
  }, [ws, characterId]);

  const { data } = useQuery({
    queryKey: ["attributes", characterId],
    staleTime: 5000,
    queryFn: async () => {
      ws.send(
        SuperJSON.stringify({
          type: "getCharacterAttributes",
          data: { characterId: characterId! },
        } satisfies z.infer<typeof messageSchema>),
      );

      // Wait until the query data is set by the onmessage handler
      await new Promise<void>((resolve) => {
        const check = () => {
          if (queryClient.getQueryData(["attributes", characterId])) {
            resolve();
          } else {
            setTimeout(check, 20);
          }
        };
        check();
      });

      return queryClient.getQueryData(["attributes", characterId]);
    },
    enabled: !!characterId,
  });

  return {
    characterAttributes: data,
    getCharacterAttributes: setCharacterId,
    resetCharacterAttributes: () => {
      setCharacterId(null);
      queryClient.invalidateQueries({ queryKey: ["attributes", characterId] });
    },
  };
};
