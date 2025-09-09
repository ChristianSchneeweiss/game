import {
  DamageOverTimeEffect,
  HealingOverTimeEffect,
  MindControlEffect,
  ShieldEffect,
} from "./effect";
import type { SpellCastEvent } from "./timeline-events";
import type {
  BattleManager,
  DamageType,
  Effect,
  Entity,
  Spell,
  SpellConfig,
} from "./types";

export abstract class BaseSpell implements Spell {
  config: SpellConfig;
  currentCooldown: number;
  battleManager?: BattleManager;

  constructor(config: SpellConfig) {
    this.config = config;
    this.currentCooldown = 0;
  }

  onPostRound(): void {
    if (this.currentCooldown > 0) {
      this.battleManager?.processEvent({
        eventType: "REDUCE_COOLDOWN",
        data: {
          spellId: this.config.id,
          amount: 1,
        },
      });
      this.currentCooldown--;
    }
  }

  canCast(caster: Entity): boolean {
    return (
      caster.mana >= this.config.manaCost &&
      this.currentCooldown === 0 &&
      !caster.isDead()
    );
  }

  getValidTargets(caster: Entity): Entity[] {
    if (!this.battleManager) throw new Error("Battle manager not set");
    const allEntities = this.battleManager.getAliveEntities();

    switch (this.config.targetType) {
      case "SELF":
        return [caster];
      case "SINGLE_ALLY":
        return this.battleManager
          .getTeam(caster.team)
          .filter((e) => !e.isDead());
      case "SINGLE_ENEMY":
        return allEntities.filter((e) => e.team !== caster.team && !e.isDead());
      case "ALL_ALLIES":
        return this.battleManager
          .getTeam(caster.team)
          .filter((e) => !e.isDead());
      case "ALL_ENEMIES":
        return allEntities.filter((e) => e.team !== caster.team && !e.isDead());
      case "DEAD_ALLY":
        return Array.from(this.battleManager.deadEntities.values()).filter(
          (e) => e.team === caster.team
        );
      case "NO_TARGET":
        return [];
      case "AREA":
        return [];
      default:
        return [];
    }
  }

  cast(caster: Entity, targets: Entity[]): SpellCastEvent | null {
    if (!this.battleManager) throw new Error("Battle manager not set");
    if (!this.canCast(caster)) {
      return null;
    }

    if (!this.validateTargets(caster, targets)) {
      return null;
    }

    this.processCasting(caster);
    const roll = Math.round(this.battleManager.getRNG() * 20);
    const result = this._cast(caster, targets, this.battleManager, roll);
    if (!result) return null;
    return {
      eventType: "SPELL_CAST",
      data: result,
    };
  }

  protected abstract _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null;

  protected validateTargets(caster: Entity, targets: Entity[]): boolean {
    if (this.config.targetType === "NO_TARGET") return true;
    if (targets.length === 0) return false;

    const validTargets = this.getValidTargets(caster);
    return targets.every((target) => validTargets.includes(target));
  }

  protected processCasting(caster: Entity): void {
    caster.mana -= this.config.manaCost;
    // because we already reduce the cooldown on round end in the cast round
    // we need to add 1 to make sure a cooldown of 1 is not the next round but the one after that
    // eg: spell with cooldown 1 cast at round 1 will be available at round 3
    // one round cooldown
    this.currentCooldown =
      this.config.cooldown === 0 ? 0 : this.config.cooldown + 1;
  }
}

export class DamageSpell extends BaseSpell {
  protected damageAmount: number;
  protected damageType: DamageType;

  constructor(
    config: SpellConfig,
    damageAmount: number,
    damageType: DamageType
  ) {
    super(config);
    this.damageAmount = damageAmount;
    this.damageType = damageType;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null {
    const damageDealt = new Map<string, number>();

    targets.forEach((target) => {
      const damage = Math.floor(this.calculateRawDamage(caster, target, roll));
      const realDamage = battleManager.handler.damage(
        this,
        damage,
        this.damageType,
        caster,
        target
      );
      damageDealt.set(target.id, realDamage);
    });

    const totalDamage = damageDealt
      .values()
      .reduce((acc, curr) => acc + curr, 0);

    const hookResult = this.realDamageHook(
      battleManager,
      caster,
      targets,
      roll,
      totalDamage
    );

    return {
      ...hookResult,
      roll,
      spellId: this.config.id,
      totalDamage,
      damageApplied: damageDealt,
    };
  }

  protected calculateRawDamage(
    caster: Entity,
    target: Entity,
    roll: number
  ): number {
    return this.damageAmount;
  }

  protected realDamageHook(
    battleManager: BattleManager,
    caster: Entity,
    targets: Entity[],
    roll: number,
    damage: number
  ): Partial<SpellCastEvent["data"]> | null {
    return null;
  }
}

export class HealingSpell extends BaseSpell {
  protected healAmount: number;

  constructor(config: SpellConfig, healAmount: number) {
    super(config);
    this.healAmount = healAmount;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null {
    const healingDone = new Map<string, number>();

    targets.forEach((target) => {
      const scaledHealing = this.calculateHealing(caster);
      const realHealing = battleManager.handler.healing(
        this,
        scaledHealing,
        caster,
        target
      );
      healingDone.set(target.id, realHealing);
    });

    return {
      healingApplied: healingDone,
      roll,
      spellId: this.config.id,
    };
  }

  protected calculateHealing(caster: Entity): number {
    return this.healAmount;
  }
}

export class ApplyStatusSpell extends BaseSpell {
  private effectFactory: (
    source: Entity,
    target: Entity,
    self: ApplyStatusSpell
  ) => Effect;

  constructor(
    config: SpellConfig,
    effectFactory: (
      source: Entity,
      target: Entity,
      self: ApplyStatusSpell
    ) => Effect
  ) {
    super(config);
    this.effectFactory = effectFactory;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null {
    const effectsApplied = new Map<string, string>();

    targets.forEach((target) => {
      const effect = this.effectFactory(caster, target, this);
      const realEffect = battleManager.handler.effect(
        this,
        effect,
        caster,
        target
      );
      if (realEffect) {
        // effectsApplied.set(target.id, realEffect.) // TODO
      }
    });

    return {
      effectsApplied,
      roll,
      spellId: this.config.id,
    };
  }
}

export class DotSpell extends ApplyStatusSpell {
  constructor(
    config: SpellConfig,
    damagePerRound: number,
    damageType: DamageType,
    duration: number
  ) {
    super(
      config,
      (source, target) =>
        new DamageOverTimeEffect(
          this,
          duration,
          source,
          target,
          damagePerRound,
          damageType
        )
    );
  }
}

export class HotSpell extends ApplyStatusSpell {
  constructor(config: SpellConfig, healingPerRound: number, duration: number) {
    super(
      config,
      (source, target) =>
        new HealingOverTimeEffect(
          this,
          duration,
          source,
          target,
          healingPerRound
        )
    );
  }
}

export class ShieldSpell extends ApplyStatusSpell {
  constructor(config: SpellConfig, shieldAmount: number, duration: number) {
    super(
      config,
      (source, target) =>
        new ShieldEffect(this, duration, source, target, shieldAmount)
    );
  }
}

export class AoeDamageSpell extends DamageSpell {
  constructor(
    config: Omit<SpellConfig, "targetType">,
    damageAmount: number,
    damageType: DamageType
  ) {
    super({ ...config, targetType: "ALL_ENEMIES" }, damageAmount, damageType);
  }
}

export class SummonSpell extends BaseSpell {
  private summonFactory: () => Entity;

  constructor(
    config: Omit<SpellConfig, "targetType">,
    summonFactory: () => Entity
  ) {
    super({ ...config, targetType: "NO_TARGET" });
    this.summonFactory = summonFactory;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null {
    const summonedEntity = this.summonFactory();
    summonedEntity.team = caster.team;
    battleManager.join(summonedEntity);

    return {
      success: true,
      message: `${caster.name} summoned a minion`,
      affectedTargets: [],
      entitiesSummoned: [summonedEntity],
      roll,
      caster,
      spellId: this.config.id,
    };
  }
}

export class ResurrectionSpell extends BaseSpell {
  private healthPercentage: number;

  constructor(
    config: Omit<SpellConfig, "targetType">,
    healthPercentage: number = 50
  ) {
    super({ ...config, targetType: "DEAD_ALLY" });
    this.healthPercentage = healthPercentage;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null {
    const revivedEntities: Entity[] = [];

    targets.forEach((target) => {
      const healthToRestore = Math.floor(
        target.maxHealth * (this.healthPercentage / 100)
      );
      if (battleManager.reviveEntity(target.id, healthToRestore)) {
        revivedEntities.push(target);
      }
    });

    return {
      success: true,
      message: `${caster.name} cast ${this.config.name}`,
      affectedTargets: targets,
      entitiesRevived: revivedEntities,
      roll,
      caster,
      spellId: this.config.id,
    };
  }
}

export class TimeWarpSpell extends BaseSpell {
  private extraActions: number;

  constructor(config: Omit<SpellConfig, "targetType">, extraActions: number) {
    super({ ...config, targetType: "SINGLE_ALLY" });
    this.extraActions = extraActions;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleState: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null {
    const currentRound = battleState.getCurrentRound();
    const target = targets[0];
    if (!target) {
      return null;
    }

    const targetIndex = currentRound.order.indexOf(target.id);
    if (targetIndex === -1) {
      return null;
    }

    currentRound.order.splice(targetIndex, 0, target.id);

    return {
      roll,
      spellId: this.config.id,
    };
  }
}

export class MindControlSpell extends ApplyStatusSpell {
  constructor(config: Omit<SpellConfig, "targetType">, duration: number) {
    super({ ...config, targetType: "SINGLE_ENEMY" }, (source, target) => {
      return new MindControlEffect(this, duration, source, target, target.team);
    });
  }
}
