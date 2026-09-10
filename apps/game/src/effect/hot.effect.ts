import type { Effect } from "../types";
import { PeriodicEffect } from "./periodic.effect";

export interface HealingOverTimeEffectExposed extends Effect {
  readonly healingPerRound: number;
}

export class HealingOverTimeEffect
  extends PeriodicEffect
  implements HealingOverTimeEffectExposed
{
  readonly healingPerRound: number;

  constructor(duration: number, healingPerRound: number) {
    super("HOT", duration);
    this.healingPerRound = healingPerRound;
  }

  protected tick(): void {
    const source = this.getSource();
    const target = this.getTarget();
    const healing = this.battleManager.handler.healing(
      this,
      this.healingPerRound,
      source,
      target,
    );
    this.battleManager.processEvent({
      eventType: "EFFECT_TRIGGER",
      data: {
        effectId: this.id,
        ...healing,
      },
    });
  }
}
