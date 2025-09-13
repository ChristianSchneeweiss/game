import { BaseEffect } from "./base-effect";

export class ShieldEffect extends BaseEffect {
  private shieldAmount: number;

  constructor(duration: number, shieldAmount: number) {
    super("SHIELD", duration);
    this.shieldAmount = shieldAmount;
  }

  beforeTakingDamage(damage: number): number {
    const damageToApply = Math.max(0, damage - this.shieldAmount);
    this.shieldAmount -= damage;
    if (this.shieldAmount <= 0) {
      this.removeEffect();
    }
    return damageToApply;
  }
}
