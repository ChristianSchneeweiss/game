import type { Entity, ModifierOperation, Spell } from "../types";
import { BaseEffect } from "./base-effect";

/**
 * A curse that increases the damage taken by the target.
 */
export class WeakendEffect extends BaseEffect {
  constructor(
    spellSource: Spell,
    duration: number,
    source: Entity,
    target: Entity,
    private bonusDamage: number,
    private modifier: ModifierOperation
  ) {
    super(spellSource, "CURSE", duration, source, target);
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
