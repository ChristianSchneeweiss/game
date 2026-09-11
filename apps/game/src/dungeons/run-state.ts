import { routeNeedsChoice, type DungeonRoute } from "./route";

export type RunPhase =
  | "prepared"
  | "fighting"
  | "awaiting-choice"
  | "ready"
  | "complete"
  | "defeated";

/** Derived from saved state; there is no second mutable status to reconcile. */
export function dungeonRunPhase(run: {
  cleared: boolean;
  activeBattle: boolean;
  round: number;
  totalWaves: number;
  resources: readonly { health: number }[];
  route?: DungeonRoute | null;
}): RunPhase {
  if (run.cleared) return "complete";
  if (run.activeBattle) return "fighting";
  if (!run.resources.some((hero) => hero.health > 0)) return "defeated";
  if (routeNeedsChoice(run.route, run.round, run.totalWaves))
    return "awaiting-choice";
  return run.round === 0 ? "prepared" : "ready";
}
