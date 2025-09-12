import type {
  BattleHandler,
  Effect,
  EffectType,
  Entity,
  Spell,
} from "../types";

export abstract class BaseEffect implements Effect {
  effectType: EffectType;
  duration: number;
  source: Entity;
  target: Entity;
  spellSource: Spell;
  battleHandler?: BattleHandler;

  constructor(
    spellSource: Spell,
    effectType: EffectType,
    duration: number,
    source: Entity,
    target: Entity
  ) {
    this.effectType = effectType;
    // we add 1 to the duration to account for the initial round.
    // as the duration already gets decremented by 1 in the onPostRound method.
    this.duration = duration + 1;
    this.source = source;
    this.target = target;
    this.spellSource = spellSource;
  }

  onPreRound(): void {}

  onPostRound(): void {
    this.duration--;

    if (this.duration <= 0) {
      this.removeEffect();
    }
  }

  onApply(): void {}

  onRemove(): void {}

  beforeTakingDamage(damage: number): number {
    return damage;
  }

  beforeTakingHealing(healing: number): number {
    return healing;
  }

  beforeTakingEffect(effect: Effect): Effect | null {
    return effect;
  }

  beforeDealingDamage(damage: number): number {
    return damage;
  }

  beforeDealingHealing(healing: number): number {
    return healing;
  }

  beforeDealingEffect(effect: Effect): Effect | null {
    return effect;
  }

  removeEffect(): void {
    this.target.removeEffect(this);
  }
}
