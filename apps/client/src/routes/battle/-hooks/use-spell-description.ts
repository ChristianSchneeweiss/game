import type { TinyEmitter } from "@/utils/tiny-emitter";
import type { SpellDescription } from "@loot-game/game/types";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import type {
  BattleMessage,
  ResponseMessage,
} from "../../../../../server/src/durable-objects/battle-ws";

export const useSpellDescription = (
  sendMessage: (message: string) => void,
  wsEvents: TinyEmitter<ResponseMessage>,
) => {
  const [attributes, setAttributes] = useState<Map<string, SpellDescription>>(
    new Map(),
  );

  useEffect(() => {
    if (!wsEvents) return;

    return wsEvents.on((response: ResponseMessage) => {
      if (response.type === "spellDescription") {
        setAttributes((prev) => {
          prev.set(response.data.spellId, response.data.description);
          return prev;
        });
      }
    });
  }, [wsEvents]);

  const getSpellDescription = (spellId: string) => {
    sendMessage(
      SuperJSON.stringify({
        type: "getSpellDescription",
        data: { spellId: spellId },
      } satisfies BattleMessage),
    );
  };

  return {
    spellDescription: attributes,
    getSpellDescription,
  };
};
