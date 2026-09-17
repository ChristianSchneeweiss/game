import type { BM } from "../../../apps/game/src/bm";
import { combatState } from "./invariants";

export function tacticalState(battle: BM) {
  return {
    ...combatState(battle),
    grid: structuredClone(battle.grid),
    revision: battle.revision,
  };
}
