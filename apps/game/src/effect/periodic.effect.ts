import type { EffectType } from "../types";
import { BaseEffect } from "./base-effect";

/** One tick per affected turn, including a turn lost to an action blocker. */
export abstract class PeriodicEffect extends BaseEffect {
  private tickedThisRound = false;
  private tickDelivered = false;

  constructor(type: Extract<EffectType, "DOT" | "HOT">, duration: number) {
    super(type, duration, "turn");
  }

  protected abstract tick(): void;

  onEndStep() {
    if (!this.getTarget().activeEffects.includes(this)) return null;
    if (!this.tickDelivered) this.tick();
    this.tickDelivered = false;
    this.tickedThisRound = true;
    return super.onEndStep();
  }

  onPostRound(): void {
    if (this.getTarget().isDead()) return;
    // A late application may miss the holder's turn in the current round.
    // Settle its first tick at round end and credit it to the next end step;
    // that step still consumes duration, but cannot deliver the tick twice.
    if (!this.tickedThisRound && !this.tickDelivered) {
      this.tick();
      this.tickDelivered = true;
    }
    this.tickedThisRound = false;
  }
}
