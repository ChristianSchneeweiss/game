import type { TinyEmitter } from "@/utils/tiny-emitter";
import type { EntityAttributes } from "@loot-game/game/types";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import type {
  BattleMessage,
  ResponseMessage,
} from "../../../../../server/src/battle-ws";

export const useAttributes = (
  sendMessage: (message: string) => void,
  wsEvents: TinyEmitter<ResponseMessage>,
) => {
  const [attributes, setAttributes] = useState<Map<string, EntityAttributes>>(
    new Map(),
  );

  useEffect(() => {
    if (!wsEvents) return;

    return wsEvents.on((response: ResponseMessage) => {
      if (response.type === "characterAttributes") {
        setAttributes((prev) => {
          prev.set(response.data.entityId, response.data.attributes);
          return prev;
        });
      }
    });
  }, [wsEvents]);

  const getCharacterAttributes = (characterId: string) => {
    sendMessage(
      SuperJSON.stringify({
        type: "getCharacterAttributes",
        data: { characterId: characterId! },
      } satisfies BattleMessage),
    );
  };

  return {
    characterAttributes: attributes,
    getCharacterAttributes,
    resetCharacterAttributes: () => {
      setAttributes(new Map());
    },
  };
};
