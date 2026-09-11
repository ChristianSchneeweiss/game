import type { TinyEmitter } from "@/utils/tiny-emitter";
import type {
  Affinities,
  EntityAttributes,
  SpecialAttributes,
} from "@loot-game/game/entity-types";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import type { BattleMessage } from "../../../../../server/src/battle/protocol";
import type { BattleConnectionEvent } from "./use-battle-connection";

export const useAttributes = (
  sendMessage: (message: string) => void,
  wsEvents: TinyEmitter<BattleConnectionEvent>,
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

    const unsubscribe = wsEvents.on((response) => {
      if (response.type === "characterAttributes") {
        setAttributes((prev) => {
          return new Map(prev).set(response.data.entityId, response.data);
        });
      }
    });
    return () => unsubscribe();
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
