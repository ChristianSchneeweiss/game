import type { Effect } from "../types";
import { BaseEffect } from "./base-effect";

export interface HealingOverTimeEffectExposed extends Effect {
  readonly healingPerRound: number;
}

export class HealingOverTimeEffect
  extends BaseEffect
  implements HealingOverTimeEffectExposed
{
  readonly healingPerRound: number;

  constructor(duration: number, healingPerRound: number) {
    super("HOT", duration);
    this.healingPerRound = healingPerRound;
  }

  onPostRound(): void {
    const source = this.getSource();
    const target = this.getTarget();
    const spellSource = this.getSpellSource();
    const healing = this.battleManager?.handler.healing(
      this,
      this.healingPerRound,
      source,
      target
    );
    console.log(
      `${source.name} heals ${healing} to ${target.name} with ${spellSource.config.name}`
    );
    super.onPostRound();
  }
}
