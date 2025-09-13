import type { DamageType, Effect, Entity, Spell } from "../types";
import { BaseEffect } from "./base-effect";

export interface DamageOverTimeEffectExposed extends Effect {
  readonly damagePerRound: number;
  readonly damageType: DamageType;
}

export class DamageOverTimeEffect
  extends BaseEffect
  implements DamageOverTimeEffectExposed
{
  readonly damagePerRound: number;
  readonly damageType: DamageType;

  constructor(
    spellSource: Spell,
    duration: number,
    source: Entity,
    target: Entity,
    damagePerRound: number,
    damageType: DamageType
  ) {
    super(spellSource, "DOT", duration, source, target);
    this.damagePerRound = damagePerRound;
    this.damageType = damageType;
  }

  onPostRound(): void {
    const source = this.getSource();
    const target = this.getTarget();
    const spellSource = this.getSpellSource();

    const damage = this.battleManager?.handler.damage(
      this,
      this.damagePerRound,
      this.damageType,
      source,
      target
    );
    console.log(
      `${source.name} deals ${damage} damage to ${target.name} with ${spellSource.config.name}`
    );
    super.onPostRound();
  }
}
