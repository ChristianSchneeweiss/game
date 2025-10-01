import type { DamageHookArgs } from "../lifecycle-hooks";
import { BaseEffect } from "./base-effect";

export class MaxHpShieldEffect extends BaseEffect {
  private shieldAmount: number;

  constructor(duration: number, shieldPercentage: number) {
    super("SHIELD", duration);
    this.shieldAmount = this.getTarget().maxHealth * shieldPercentage;
  }

  beforeTakingDamage({ damage }: DamageHookArgs): number {
    const damageToApply = Math.max(0, damage - this.shieldAmount);
    this.shieldAmount -= damage;
    if (this.shieldAmount <= 0) {
      this.removeEffect();
    }
    return damageToApply;
  }
}
