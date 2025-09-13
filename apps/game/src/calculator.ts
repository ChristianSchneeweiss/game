import type seedrandom from "seedrandom";
import type {
  BattleHandler,
  BattleManager,
  DamageType,
  Effect,
  Entity,
  HandlerReturn,
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
    damageType: DamageType,
    rng: seedrandom.PRNG
  ): {
    damage: number;
    isCrit: boolean;
  } {
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing damage and before taking damage hook

    // attacker effects hooks before dealing. highest priority
    damage = attacker.activeEffects.reduce(
      (acc, effect) => effect.beforeDealingDamage(acc),
      damage
    );

    const critChance = attacker.getAttribute("critChance");
    const critRoll = rng();
    const isCrit = critRoll < critChance;
    if (isCrit) {
      damage = damage * 2;
    }

    if (damageType === "MAGICAL") {
      const realMR =
        defender.getAttribute("magicResistance") -
        attacker.getAttribute("magicPenetration");
      damage = damage - realMR;
    } else {
      const realArmor =
        defender.getAttribute("armor") -
        attacker.getAttribute("armorPenetration");
      damage = damage - realArmor;
    }

    // defender effects hooks after dealing
    damage = defender.activeEffects.reduce(
      (acc, effect) => effect.beforeTakingDamage(acc),
      damage
    );

    return {
      damage: Math.round(Math.max(damage, 0)),
      isCrit,
    };
  }

  static calculateRealHealing(
    attacker: Entity,
    defender: Entity,
    healing: number
  ): number {
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing healing and before taking healing hook

    // attacker effects hooks before dealing
    healing = attacker.activeEffects.reduce(
      (acc, effect) => effect.beforeDealingHealing(acc),
      healing
    );

    // defender effects hooks before taking
    healing = defender.activeEffects.reduce(
      (acc, effect) => effect.beforeTakingHealing(acc),
      healing
    );

    return Math.round(healing);
  }

  static calculateRealEffect(
    effect: Effect,
    battleManager: BattleManager
  ): Effect | null {
    const attacker = battleManager.getEntityById(effect.sourceId);
    const defender = battleManager.getEntityById(effect.targetId);
    if (!attacker) throw new Error(`attacker not found ${effect.sourceId}`);
    if (!defender) throw new Error(`defender not found ${effect.targetId}`);
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing effect and before taking effect hook

    // attacker effects hooks before taking
    const realEffect = attacker.activeEffects.reduce<Effect | null>(
      (acc, effect) =>
        (acc ? effect.beforeTakingEffect(acc) : null) as Effect | null,
      effect
    );

    // defender effects hooks before dealing
    return defender.activeEffects.reduce<Effect | null>(
      (acc, effect) =>
        (acc ? effect.beforeDealingEffect(acc) : null) as Effect | null,
      realEffect
    );
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
  ) {
    const { damage, isCrit } = calculator.calculateRealDamage(
      source,
      target,
      amount,
      type,
      this.battleManager.getPRNG()
    );
    target.applyDamage(damage, type, source);

    if (target.isDead()) {
      this.battleManager.processEntityDeath(target, {
        spellId: spell.config!.id,
      });
    }

    const damageApplied = new Map<string, number>().set(target.id, damage);
    const damageReturn = {
      damageApplied,
      totalDamage: damage,
      isCrit,
    };

    const lifesteal = source.getAttribute("lifesteal");
    const omnivamp = source.getAttribute("omnivamp");

    if (lifesteal + omnivamp === 0) return damageReturn;

    let healing: HandlerReturn | null = null;
    if (type === "PHYSICAL") {
      const lifesteal = source.getAttribute("lifesteal");
      if (lifesteal > 0) {
        healing = this.healing(spell, damage * lifesteal, source, source);
      }
    } else {
      const omnivamp = source.getAttribute("omnivamp");
      if (omnivamp > 0) {
        healing = this.healing(spell, damage * omnivamp, source, source);
      }
    }

    return this.mergeHandlerReturns([damageReturn, healing!]);
  }

  healing(
    spell: Spell | Effect,
    amount: number,
    source: Entity,
    target: Entity
  ) {
    const healing = calculator.calculateRealHealing(source, target, amount);
    target.applyHealing(healing, source);
    const healingApplied = new Map<string, number>().set(target.id, healing);
    return {
      healingApplied,
      totalHealing: healing,
      isCrit: false,
    };
  }

  effect(
    spell: Spell | Effect,
    effect: Effect,
    source: Entity,
    target: Entity
  ) {
    const realEffect = calculator.calculateRealEffect(
      effect,
      this.battleManager
    );
    if (!realEffect) return null;
    console.log(
      `${source.name} applies ${realEffect.effectType} to ${target.name}`
    );
    realEffect.battleManager = this.battleManager;
    this.battleManager.addEffect(realEffect);
    target.applyEffect(realEffect);
    realEffect.onApply?.();
    const effectsApplied = new Map<string, string[]>().set(target.id, [
      realEffect.id,
    ]);
    return {
      effectsApplied,
      realEffects: effectsApplied.values(),
      isCrit: false,
    };
  }

  mergeHandlerReturns(returns: HandlerReturn[]): HandlerReturn {
    const damageApplied = new Map<string, number>();
    const healingApplied = new Map<string, number>();
    const effectsApplied = new Map<string, string[]>();
    for (const r of returns) {
      if (r.damageApplied) {
        for (const [key, value] of r.damageApplied) {
          const currentValue = damageApplied.get(key) ?? 0;
          damageApplied.set(key, currentValue + value);
        }
      }
      if (r.healingApplied) {
        for (const [key, value] of r.healingApplied) {
          const currentValue = healingApplied.get(key) ?? 0;
          healingApplied.set(key, currentValue + value);
        }
      }
      if (r.effectsApplied) {
        for (const [key, value] of r.effectsApplied) {
          const currentValue = effectsApplied.get(key) ?? [];
          effectsApplied.set(key, [...currentValue, ...value]);
        }
      }
    }
    return {
      damageApplied,
      healingApplied,
      effectsApplied,
      totalDamage: damageApplied.values().reduce((acc, curr) => acc + curr, 0),
      isCrit: returns.some((r) => r.isCrit),
    };
  }
}
