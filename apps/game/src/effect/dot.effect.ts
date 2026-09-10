import type { DamageType, Effect } from "../types";
import { PeriodicEffect } from "./periodic.effect";

export interface DamageOverTimeEffectExposed extends Effect {
  readonly damagePerRound: number;
  readonly damageType: DamageType;
}

export class DamageOverTimeEffect
  extends PeriodicEffect
  implements DamageOverTimeEffectExposed
{
  readonly damagePerRound: number;
  readonly damageType: DamageType;

  constructor(
    duration: number,
    damagePerRound: number,
    damageType: DamageType,
  ) {
    super("DOT", duration);
    this.damagePerRound = damagePerRound;
    this.damageType = damageType;
  }

  protected tick(): void {
    const source = this.getSource();
    const target = this.getTarget();

    const damage = this.battleManager.handler.damage(
      this,
      this.damagePerRound,
      this.damageType,
      source,
      target,
      { cause: "periodic" },
    );
    this.battleManager.processEvent({
      eventType: "EFFECT_TRIGGER",
      data: {
        effectId: this.id,
        ...damage,
      },
    });
  }

  getDescription(): string {
    return `${this.damagePerRound} ${this.damageType} damage per affected turn`;
  }
}
