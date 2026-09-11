import type { TinyEmitter } from "@/utils/tiny-emitter";
import type { SpellDescription } from "@loot-game/game/types";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import type { BattleMessage } from "../../../../../server/src/battle/protocol";
import type { BattleConnectionEvent } from "./use-battle-connection";

export const useSpellDescription = (
  sendMessage: (message: string) => void,
  wsEvents: TinyEmitter<BattleConnectionEvent>,
) => {
  const [attributes, setAttributes] = useState<Map<string, SpellDescription>>(
    new Map(),
  );

  useEffect(() => {
    if (!wsEvents) return;

    const unsubscribe = wsEvents.on((response) => {
      if (response.type === "spellDescription") {
        setAttributes((prev) => {
          return new Map(prev).set(
            response.data.spellId,
            response.data.description,
          );
        });
      }
    });
    return () => unsubscribe();
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
