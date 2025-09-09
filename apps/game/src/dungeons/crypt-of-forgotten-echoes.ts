import { GhoulKnightIvern } from "../enemies/ghoul-knight-ivern";
import { RottingCorpse } from "../enemies/rotting-corpse";
import { SkeletonGrunt } from "../enemies/skeleton-grunt";
import { WispOfRegret } from "../enemies/wisp-of-regret";
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
    rollEnemies: () => {
      return [
        [new SkeletonGrunt(), new SkeletonGrunt()],
        [new RottingCorpse(), new RottingCorpse()],
        [new WispOfRegret(), new WispOfRegret()],
        [new GhoulKnightIvern()],
      ];
    },
  }) satisfies DungeonConfig;
