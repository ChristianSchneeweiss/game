import type seedrandom from "seedrandom";
import type {
  BattleHandler,
  BattleManager,
  HandlerReturn,
} from "./battle-types";
import type { Entity } from "./entity-types";
import type { DamageOptions, DamageType, Effect, Spell } from "./types";

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
    rng: seedrandom.PRNG,
    options: DamageOptions = {},
  ): {
    damage: number;
    isCrit: boolean;
  } {
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing damage and before taking damage hook

    // attacker effects hooks before dealing. highest priority
    damage = [...attacker.activeEffects].reduce(
      (acc, effect) =>
        attacker.activeEffects.includes(effect)
          ? effect.beforeDealingDamage({
              damage: acc,
              type: damageType,
              attacker: attacker,
              defender: defender,
              cause: options.cause ?? "direct",
            })
          : acc,
      damage,
    );

    const critChance = attacker.getAttribute("critChance");
    const critRoll = rng();
    const isCrit = critRoll < critChance;
    if (isCrit) {
      const critDamage = attacker.getAttribute("critDamage");
      damage = damage * (1 + critDamage);
    }

    const defenseMultiplier =
      1 - Math.min(1, Math.max(0, options.ignoreDefense ?? 0));
    if (damageType === "MAGICAL") {
      const realMR =
        defender.getAttribute("magicResistance") * defenseMultiplier -
        attacker.getAttribute("magicPenetration");
      damage = damage - realMR;
    } else {
      const realArmor =
        defender.getAttribute("armor") * defenseMultiplier -
        attacker.getAttribute("armorPenetration");
      damage = damage - realArmor;
    }

    damage = Math.max(0, damage);
    // defender effects hooks after dealing
    damage = [...defender.activeEffects].reduce(
      (acc, effect) =>
        defender.activeEffects.includes(effect)
          ? effect.beforeTakingDamage({
              damage: acc,
              type: damageType,
              attacker: attacker,
              defender: defender,
              cause: options.cause ?? "direct",
            })
          : acc,
      damage,
    );

    return {
      damage: Math.round(Math.max(damage, 0)),
      isCrit,
    };
  }

  static calculateRealHealing(
    attacker: Entity,
    defender: Entity,
    healing: number,
  ): number {
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing healing and before taking healing hook

    // attacker effects hooks before dealing
    healing = [...attacker.activeEffects].reduce(
      (acc, effect) =>
        attacker.activeEffects.includes(effect)
          ? effect.beforeDealingHealing({
              healing: acc,
              attacker: attacker,
              defender: defender,
            })
          : acc,
      healing,
    );

    // defender effects hooks before taking
    healing = [...defender.activeEffects].reduce(
      (acc, effect) =>
        defender.activeEffects.includes(effect)
          ? effect.beforeTakingHealing({
              healing: acc,
              attacker: attacker,
              defender: defender,
            })
          : acc,
      healing,
    );

    return Math.round(healing);
  }

  static calculateRealEffect(
    effect: Effect,
    battleManager: BattleManager,
  ): Effect | null {
    const attacker = battleManager.getEntityById(effect.sourceId);
    const defender = battleManager.getEntityById(effect.targetId);
    if (!attacker) throw new Error(`attacker not found ${effect.sourceId}`);
    if (!defender) throw new Error(`defender not found ${effect.targetId}`);
    // todo add modifiers before from source, after from defender, and resistances
    // before dealing effect and before taking effect hook

    // Outgoing hooks precede incoming hooks; removal must not skip a sibling.
    const realEffect = [...attacker.activeEffects].reduce<Effect | null>(
      (acc, effect) =>
        !attacker.activeEffects.includes(effect)
          ? acc
          : acc
            ? effect.beforeDealingEffect({
                effect: acc,
                attacker: attacker,
                defender: defender,
              })
            : null,
      effect,
    );

    return [...defender.activeEffects].reduce<Effect | null>(
      (acc, effect) =>
        !defender.activeEffects.includes(effect)
          ? acc
          : acc
            ? effect.beforeTakingEffect({
                effect: acc,
                attacker: attacker,
                defender: defender,
              })
            : null,
      realEffect,
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
    target: Entity,
    options: DamageOptions = {},
  ): HandlerReturn {
    if (target.isDead()) return { isCrit: false };
    const { damage, isCrit } = calculator.calculateRealDamage(
      source,
      target,
      amount,
      type,
      this.battleManager.getPRNG(),
      options,
    );
    const previousHealth = target.health;
    target.applyDamage(damage, type, source);
    const appliedDamage = previousHealth - target.health;
    this.recordImpact(spell, source, target, -appliedDamage, isCrit);

    if (target.isDead()) {
      this.battleManager.processEntityDeath(target, {
        spellId: "config" in spell ? spell.config.id : spell.id,
      });
    }

    const damageApplied = new Map<string, number>().set(
      target.id,
      appliedDamage,
    );
    const damageReturn = {
      damageApplied,
      totalDamage: appliedDamage,
      isCrit,
    };

    const lifesteal = source.getAttribute("lifesteal");
    const omnivamp = source.getAttribute("omnivamp");

    if (lifesteal + omnivamp === 0) return damageReturn;

    let healing: HandlerReturn | null = null;
    if (type === "PHYSICAL") {
      const lifesteal = source.getAttribute("lifesteal");
      if (lifesteal > 0) {
        healing = this.healing(
          spell,
          appliedDamage * lifesteal,
          source,
          source,
        );
      }
    } else {
      const omnivamp = source.getAttribute("omnivamp");
      if (omnivamp > 0) {
        healing = this.healing(spell, appliedDamage * omnivamp, source, source);
      }
    }

    return healing
      ? this.mergeHandlerReturns([damageReturn, healing])
      : damageReturn;
  }

  healing(
    spell: Spell | Effect,
    amount: number,
    source: Entity,
    target: Entity,
  ): HandlerReturn {
    if (target.isDead()) return { isCrit: false };
    const healing = calculator.calculateRealHealing(source, target, amount);
    const previousHealth = target.health;
    target.applyHealing(healing, source);
    const appliedHealing = target.health - previousHealth;
    this.recordImpact(spell, source, target, appliedHealing, false);
    const healingApplied = new Map<string, number>().set(
      target.id,
      appliedHealing,
    );
    return {
      healingApplied,
      isCrit: false,
    };
  }

  private recordImpact(
    spell: Spell | Effect,
    source: Entity,
    target: Entity,
    healthChange: number,
    isCrit: boolean,
  ): void {
    this.battleManager.recordImpact({
      cause:
        "config" in spell
          ? { kind: "spell", id: spell.config.id, sourceId: source.id }
          : { kind: "effect", id: spell.id, sourceId: source.id },
      targetId: target.id,
      healthChange,
      isCrit,
    });
  }

  effect(
    spell: Spell | Effect,
    effect: Effect,
    source: Entity,
    target: Entity,
  ): HandlerReturn | null {
    if (target.isDead()) return null;
    if (target.activeEffects.includes(effect)) return null;
    this.attachEffectContext(effect, spell, source, target);

    const realEffect = calculator.calculateRealEffect(
      effect,
      this.battleManager,
    );
    if (!realEffect) return null;
    this.attachEffectContext(realEffect, spell, source, target);
    console.log(
      `${source.name} applies ${realEffect.effectType} to ${target.name}`,
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
      isCrit: false,
    };
  }

  private attachEffectContext(
    effect: Effect,
    origin: Spell | Effect,
    source: Entity,
    target: Entity,
  ) {
    effect.origin =
      "config" in origin
        ? { kind: "spell", id: origin.config.id }
        : {
            kind: origin.effectType === "PASSIVE" ? "passive" : "effect",
            id: origin.id,
          };
    effect.sourceId = source.id;
    effect.targetId = target.id;
    effect.battleManager = this.battleManager;
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
