import type {
  BattleHandler,
  DamageType,
  Effect,
  EffectType,
  Entity,
  Spell,
  StatModifier,
  Team,
} from "./types";

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
    this.duration = duration;
    this.source = source;
    this.target = target;
    this.spellSource = spellSource;
  }

  onRoundStart(): void {}

  onRoundEnd(): void {
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

export class StatModifierEffect extends BaseEffect {
  private modifiers: StatModifier[];

  constructor(
    spellSource: Spell,
    effectType: EffectType,
    duration: number,
    source: Entity,
    modifiers: StatModifier[],
    target: Entity
  ) {
    super(spellSource, effectType, duration, source, target);
    this.modifiers = modifiers;
  }

  onApply(): void {
    this.modifiers.forEach((mod) => {
      this.target.statModifiers.push(mod);
    });
  }

  onRemove(): void {
    this.modifiers.forEach((mod) => {
      const index = this.target.statModifiers.indexOf(mod);
      if (index !== -1) {
        this.target.statModifiers.splice(index, 1);
      }
    });
  }
}

interface DamageOverTimeEffectExposed extends Effect {
  readonly damagePerRound: number;
  readonly damageType: DamageType;
}

interface HealingOverTimeEffectExposed extends Effect {
  readonly healingPerRound: number;
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

  onRoundEnd(): void {
    const damage = this.battleHandler?.damage(
      this,
      this.damagePerRound,
      this.damageType,
      this.source,
      this.target
    );
    console.log(
      `${this.source.name} deals ${damage} damage to ${this.target.name} with ${this.spellSource.config.name}`
    );
    super.onRoundEnd();
  }
}

export class HealingOverTimeEffect
  extends BaseEffect
  implements HealingOverTimeEffectExposed
{
  readonly healingPerRound: number;

  constructor(
    spellSource: Spell,
    duration: number,
    source: Entity,
    target: Entity,
    healingPerRound: number
  ) {
    super(spellSource, "HOT", duration, source, target);
    this.healingPerRound = healingPerRound;
  }

  onRoundEnd(): void {
    const healing = this.battleHandler?.healing(
      this,
      this.healingPerRound,
      this.source,
      this.target
    );
    console.log(
      `${this.source.name} heals ${healing} to ${this.target.name} with ${this.spellSource.config.name}`
    );
    super.onRoundEnd();
  }
}

export class MindControlEffect extends BaseEffect {
  private originalTeam: Team;

  constructor(
    spellSource: Spell,
    duration: number,
    source: Entity,
    target: Entity,
    originalTeam: Team
  ) {
    super(spellSource, "CONTROL", duration, source, target);
    this.originalTeam = originalTeam;
  }

  onApply(): void {
    this.target.team = this.source.team;
  }

  onRemove(): void {
    this.target.team = this.originalTeam;
  }
}

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

  onRoundStart(): void {
    this.childEffects.forEach((effect) => {
      effect.onRoundStart?.();
    });
  }

  onRoundEnd(): void {
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
