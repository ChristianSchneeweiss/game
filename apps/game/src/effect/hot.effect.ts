import type { Effect, Entity, Spell } from "../types";
import { BaseEffect } from "./base-effect";

export interface HealingOverTimeEffectExposed extends Effect {
  readonly healingPerRound: number;
}

export class HealingOverTimeEffect
  extends BaseEffect
  implements HealingOverTimeEffectExposed
{
  readonly healingPerRound: number;

  constructor(
    spellSource: Spell,
    duration: number,
    source: Entity,
    target: Entity,
    healingPerRound: number
  ) {
    super(spellSource, "HOT", duration, source, target);
    this.healingPerRound = healingPerRound;
  }

  onPostRound(): void {
    const healing = this.battleHandler?.healing(
      this,
      this.healingPerRound,
      this.source,
      this.target
    );
    console.log(
      `${this.source.name} heals ${healing} to ${this.target.name} with ${this.spellSource.config.name}`
    );
    super.onPostRound();
  }
}
