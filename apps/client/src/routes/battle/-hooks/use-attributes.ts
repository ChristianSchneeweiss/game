import type { TinyEmitter } from "@/utils/tiny-emitter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import type z from "zod";
import type {
  messageSchema,
  ResponseMessage,
} from "../../../../../server/src/battle-ws";

export const useAttributes = (
  sendMessage: (message: string) => void,
  wsEvents: TinyEmitter<ResponseMessage>,
) => {
  const queryClient = useQueryClient();
  const [characterId, setCharacterId] = useState<string | null>(null);

  useEffect(() => {
    if (!wsEvents || !characterId) return;

    const listener = (response: ResponseMessage) => {
      if (response.type === "characterAttributes") {
        queryClient.setQueryData(
          ["attributes", characterId],
          response.data.attributes,
        );
      }
    };

    wsEvents.on(listener);
    return () => {
      wsEvents.off(listener);
    };
  }, [wsEvents, characterId]);

  const { data } = useQuery({
    queryKey: ["attributes", characterId],
    staleTime: 5000,
    queryFn: async () => {
      sendMessage(
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
