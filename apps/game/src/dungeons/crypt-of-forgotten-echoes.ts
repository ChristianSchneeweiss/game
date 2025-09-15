import type { DungeonConfig } from "./types";

export const cryptOfForgottenEchoes = () =>
  ({
    key: "crypt-of-forgotten-echoes",
    name: "Crypt of Forgotten Echoes",
    description: "This is the second dungeon",
    availableEnemies: [
      ["skeleton-grunt", "skeleton-grunt"],
      ["rotting-corpse"],
      ["wisp-of-regret", "wisp-of-regret"],
      ["ghoul-knight-ivern"],
    ],
  }) satisfies DungeonConfig;
