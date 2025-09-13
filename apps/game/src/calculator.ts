import type {
  BattleHandler,
  BattleManager,
  DamageType,
  Effect,
  Entity,
  Spell,
} from "./types";

export class calculator {
  /**
   * Calculate the damage that an attacker would deal to a defender. This scales the damage based on resistances and damage effects.
   * @param attacker The entity that is attacking.
   * @param defender The entity that is being attacked.
   * @param damage The base damage amount.
   * @param damageType The type of damage being dealt.
   * @returns The calculated damage amount.
   */
  static calculateRealDamage(
    attacker: Entity,
    defender: Entity,
    damage: number,
    damageType: DamageType
  ): number {
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing damage and before taking damage hook
    return Math.round(damage);
  }

  static calculateRealHealing(
    attacker: Entity,
    defender: Entity,
    healing: number
  ): number {
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing healing and before taking healing hook
    return Math.round(healing);
  }

  static calculateRealEffect(effect: Effect): Effect | null {
    const attacker = effect.source;
    const defender = effect.target;
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing effect and before taking effect hook
    return effect;
  }
}

/**
 * This class is responsible for handling the battle logic.
 * It is responsible for calculating the damage, healing, and effects.
 * It damages, heals, and applies effects to entities.
 * It is also responsible for handling the life cycle hooks.
 * @returns The applied damage, healing, or effect.
 */
export class Handler implements BattleHandler {
  constructor(private battleManager: BattleManager) {}

  damage(
    spell: Spell | Effect,
    amount: number,
    type: DamageType,
    source: Entity,
    target: Entity
  ): number {
    const damage = calculator.calculateRealDamage(source, target, amount, type);
    target.applyDamage(damage, type, source);
    if (target.isDead()) {
      this.battleManager.processEntityDeath(target, {
        spellId: spell.config.id,
      });
    }
    return damage;
  }

  healing(
    spell: Spell | Effect,
    amount: number,
    source: Entity,
    target: Entity
  ): number {
    const healing = calculator.calculateRealHealing(source, target, amount);
    target.applyHealing(healing, source);
    return healing;
  }

  effect(
    spell: Spell | Effect,
    effect: Effect,
    source: Entity,
    target: Entity
  ): Effect | null {
    const realEffect = calculator.calculateRealEffect(effect);
    if (!realEffect) return null;
    console.log(
      `${source.name} applies ${realEffect.effectType} to ${target.name}`
    );
    realEffect.battleHandler = this.battleManager.handler;
    this.battleManager.lifeCycleHooks.push(realEffect);
    target.applyEffect(realEffect);
    return realEffect;
  }
}
