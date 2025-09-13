import type { ModifierOperation } from "../types";
import { BaseEffect } from "./base-effect";

/**
 * A curse that increases the damage taken by the target.
 */
export class WeakendEffect extends BaseEffect {
  constructor(
    duration: number,
    private bonusDamage: number,
    private modifier: ModifierOperation
  ) {
    super("CURSE", duration);
  }

  beforeTakingDamage(damage: number): number {
    let damageToApply = damage;
    if (this.modifier === "ADD") {
      damageToApply += this.bonusDamage;
    } else if (this.modifier === "MULTIPLY") {
      damageToApply *= this.bonusDamage;
    }
    damageToApply = Math.max(0, damageToApply);
    return damageToApply;
  }

  getDescription(): string {
    const text =
      this.modifier === "ADD"
        ? `${this.bonusDamage}.`
        : `${Math.round((this.bonusDamage - 1) * 100)}%.`;
    return `A curse that increases the damage taken by the target by ${text}`;
  }
}
