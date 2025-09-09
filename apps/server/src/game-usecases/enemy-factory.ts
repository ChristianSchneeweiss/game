import type { EnemyType } from "@loot-game/game/enemies";
import { GhoulKnightIvern } from "@loot-game/game/enemies/ghoul-knight-ivern";
import { Goblin } from "@loot-game/game/enemies/goblin";
import { RottingCorpse } from "@loot-game/game/enemies/rotting-corpse";
import { SkeletonGrunt } from "@loot-game/game/enemies/skeleton-grunt";
import { WispOfRegret } from "@loot-game/game/enemies/wisp-of-regret";

export const createEnemyFromType = (type: EnemyType, id?: string) => {
  switch (type) {
    case "goblin":
      return new Goblin(id);
    case "skeleton-grunt":
      return new SkeletonGrunt(id);
    case "rotting-corpse":
      return new RottingCorpse(id);
    case "wisp-of-regret":
      return new WispOfRegret(id);
    case "ghoul-knight-ivern":
      return new GhoulKnightIvern(id);
    default:
      throw new Error(`Unknown enemy type: ${type}`);
  }
};
