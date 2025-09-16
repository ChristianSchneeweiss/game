import { BaseEntity, Character } from "@loot-game/game/base-entity";
import type { Effect } from "@loot-game/game/types";
import superjson from "superjson";

export const registerRecipes = () => {
  // looks weird but kinda works ???
  superjson.registerCustom<Effect, any>(
    {
      isApplicable: (data): data is Effect => {
        return (
          typeof data === "object" && data !== null && "effectType" in data
        );
      },
      serialize: (effect) => {
        effect.battleManager = undefined;
        return effect;
      },
      deserialize: (data) => {
        return data;
      },
    },
    "Effect"
  );

  superjson.registerClass(Character, { identifier: "Character" });
  superjson.registerClass(BaseEntity, { identifier: "BaseEntity" });
};
