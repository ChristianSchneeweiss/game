import type { Effect, EffectType, Entity, Spell } from "../types";
import { BaseEffect } from "./base-effect";
import {
  DamageOverTimeEffect,
  type DamageOverTimeEffectExposed,
} from "./dot.effect";
import {
  HealingOverTimeEffect,
  type HealingOverTimeEffectExposed,
} from "./hot.effect";

export class CompositeEffect extends BaseEffect {
  private childEffects: Effect[];

  constructor(
    spellSource: Spell,
    effectType: EffectType,
    duration: number,
    source: Entity,
    target: Entity,
    childEffects: Effect[]
  ) {
    super(spellSource, effectType, duration, source, target);
    this.childEffects = [...childEffects];
    this.updateChildSourcesAndDuration();
  }

  private updateChildSourcesAndDuration(): void {
    this.childEffects.forEach((effect) => {
      effect.source = this.source;
      effect.duration = this.duration;
    });
  }

  onApply(): void {
    this.updateChildSourcesAndDuration();
    this.childEffects.forEach((effect) => {
      effect.onApply?.();
    });
  }

  onRemove(): void {
    this.childEffects.forEach((effect) => {
      effect.onRemove?.();
    });
  }

  onPreRound(): void {
    this.childEffects.forEach((effect) => {
      effect.onPreRound?.();
    });
  }

  onPostRound(): void {
    this.duration--;
    this.updateChildSourcesAndDuration();

    this.childEffects.forEach((effect) => {
      if (effect instanceof DamageOverTimeEffect) {
        const dotEffect = effect as DamageOverTimeEffectExposed;
        this.battleHandler?.damage(
          this,
          dotEffect.damagePerRound,
          dotEffect.damageType,
          this.source,
          this.target
        );
      } else if (effect instanceof HealingOverTimeEffect) {
        const hotEffect = effect as HealingOverTimeEffectExposed;
        this.target.applyHealing(hotEffect.healingPerRound, effect.source);
      }
    });

    if (this.duration <= 0) {
      this.removeEffect();
    }
  }
}
