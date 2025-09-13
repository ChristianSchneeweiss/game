import type { Effect, EffectType } from "../types";
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
    effectType: EffectType,
    duration: number,
    childEffects: Effect[]
  ) {
    super(effectType, duration);
    this.childEffects = [...childEffects];
    this.updateChildSourcesAndDuration();
  }

  private updateChildSourcesAndDuration(): void {
    this.childEffects.forEach((effect) => {
      effect.sourceId = this.sourceId;
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
      const source = this.getSource();
      const target = this.getTarget();

      if (effect instanceof DamageOverTimeEffect) {
        const dotEffect = effect as DamageOverTimeEffectExposed;
        this.battleManager?.handler.damage(
          this,
          dotEffect.damagePerRound,
          dotEffect.damageType,
          source,
          target
        );
      } else if (effect instanceof HealingOverTimeEffect) {
        const hotEffect = effect as HealingOverTimeEffectExposed;
        target.applyHealing(hotEffect.healingPerRound, source);
      }
    });

    if (this.duration <= 0) {
      this.removeEffect();
    }
  }
}
