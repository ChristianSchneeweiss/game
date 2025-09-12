import type { Entity, Spell } from "../types";
import { BaseEffect } from "./base-effect";

export class ShieldEffect extends BaseEffect {
  private shieldAmount: number;

  constructor(
    spellSource: Spell,
    duration: number,
    source: Entity,
    target: Entity,
    shieldAmount: number
  ) {
    super(spellSource, "SHIELD", duration, source, target);
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
