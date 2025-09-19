import type { TinyEmitter } from "@/utils/tiny-emitter";
import type {
  Affinities,
  EntityAttributes,
  SpecialAttributes,
} from "@loot-game/game/entity-types";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import type {
  BattleMessage,
  ResponseMessage,
} from "../../../../../server/src/durable-objects/battle-ws";

export const useAttributes = (
  sendMessage: (message: string) => void,
  wsEvents: TinyEmitter<ResponseMessage>,
) => {
  const [attributes, setAttributes] = useState<
    Map<
      string,
      {
        baseAttributes: EntityAttributes;
        specialAttributes: SpecialAttributes;
        affinities: Affinities;
      }
    >
  >(new Map());

  useEffect(() => {
    if (!wsEvents) return;

    return wsEvents.on((response: ResponseMessage) => {
      if (response.type === "characterAttributes") {
        setAttributes((prev) => {
          prev.set(response.data.entityId, response.data);
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
