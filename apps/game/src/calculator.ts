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

    let healing: HandlerReturn | null = null;
    if (type === "PHYSICAL") {
      healing = this.healing(
        spell,
        damage * source.getAttribute("lifesteal"),
        source,
        source
      );
    } else {
      healing = this.healing(
        spell,
        damage * source.getAttribute("omnivamp"),
        source,
        source
      );
    }

    return this.mergeHandlerReturns([damageReturn, healing]);
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
    const realEffect = calculator.calculateRealEffect(effect);
    if (!realEffect) return null;
    console.log(
      `${source.name} applies ${realEffect.effectType} to ${target.name}`
    );
    realEffect.battleHandler = this.battleManager.handler;
    this.battleManager.lifeCycleHooks.push(realEffect);
    target.applyEffect(realEffect);
    const effectsApplied = new Map<string, string>().set(
      target.id,
      realEffect.effectType
    );
    return {
      effectsApplied,
      realEffects: effectsApplied.values(),
      isCrit: false,
    };
  }

  mergeHandlerReturns(returns: HandlerReturn[]): HandlerReturn {
    const damageApplied = new Map<string, number>();
    const healingApplied = new Map<string, number>();
    const effectsApplied = new Map<string, string>();
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
      // TODO: add effects applied
      // if (r.effectsApplied) {
      //   for (const [key, value] of r.effectsApplied) {
      //     const currentValue = effectsApplied.get(key) ?? 0;
      //     effectsApplied.set(key, currentValue + value);
      //   }
      // }
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
