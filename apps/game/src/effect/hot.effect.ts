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
