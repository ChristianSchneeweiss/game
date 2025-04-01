import {
  DamageOverTimeEffect,
  HealingOverTimeEffect,
  MindControlEffect,
  ShieldEffect,
} from "./effect";
import type {
  BattleManager,
  DamageType,
  Effect,
  Entity,
  Spell,
  SpellConfig,
  SpellResult,
} from "./types";

export abstract class BaseSpell implements Spell {
  config: SpellConfig;
  currentCooldown: number;
  battleManager?: BattleManager;

  constructor(config: SpellConfig) {
    this.config = config;
    this.currentCooldown = 0;
  }

  onRoundEnd(): void {
    if (this.currentCooldown > 0) {
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

  cast(caster: Entity, targets: Entity[]): SpellResult {
    if (!this.battleManager) throw new Error("Battle manager not set");
    if (!this.canCast(caster)) {
      return {
        success: false,
        message: "Cannot cast spell",
        affectedTargets: [],
        caster,
        spellId: this.config.id,
      };
    }

    if (!this.validateTargets(caster, targets)) {
      return {
        success: false,
        message: "Invalid targets",
        affectedTargets: [],
        caster,
        spellId: this.config.id,
      };
    }

    this.processCasting(caster);
    const roll = Math.round(Math.random() * 20);
    return this._cast(caster, targets, this.battleManager, roll);
  }

  protected abstract _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellResult;

  protected validateTargets(caster: Entity, targets: Entity[]): boolean {
    if (this.config.targetType === "NO_TARGET") return true;
    if (targets.length === 0) return false;

    const validTargets = this.getValidTargets(caster);
    return targets.every((target) => validTargets.includes(target));
  }

  protected processCasting(caster: Entity): void {
    caster.mana -= this.config.manaCost;
    this.currentCooldown = this.config.cooldown + 1; // because we already reduce the cooldown on round end in the cast round
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
  ): SpellResult {
    const damageDealt = new Map<string, number>();

    targets.forEach((target) => {
      const damage = Math.floor(this.calculateRawDamage(caster, target, roll));
      const realDamage = battleManager.handler.damage(
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

    return {
      success: true,
      message: `${caster.name} cast ${this.config.name} for ${totalDamage} damage`,
      affectedTargets: targets,
      damageDealt,
      roll,
      caster,
      spellId: this.config.id,
    };
  }

  protected calculateRawDamage(
    caster: Entity,
    target: Entity,
    roll: number
  ): number {
    return this.damageAmount;
  }
}

export class HealingSpell extends BaseSpell {
  private healAmount: number;

  constructor(config: SpellConfig, healAmount: number) {
    super(config);
    this.healAmount = healAmount;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellResult {
    const healingDone = new Map<string, number>();

    targets.forEach((target) => {
      const scaledHealing = this.calculateHealing(caster);
      const realHealing = battleManager.handler.healing(
        scaledHealing,
        caster,
        target
      );
      healingDone.set(target.id, realHealing);
    });

    return {
      success: true,
      message: `${caster.name} cast ${this.config.name}`,
      affectedTargets: targets,
      healingDone,
      roll,
      caster,
      spellId: this.config.id,
    };
  }

  private calculateHealing(caster: Entity): number {
    return Math.round(
      this.healAmount * (1 + caster.getStat("intelligence") * 0.05)
    );
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
  ): SpellResult {
    const effectsApplied: Effect[] = [];

    targets.forEach((target) => {
      const effect = this.effectFactory(caster, target, this);
      const realEffect = battleManager.handler.effect(effect, caster, target);
      if (realEffect) {
        effectsApplied.push(realEffect);
      }
    });

    return {
      success: true,
      message: `${caster.name} cast ${this.config.name}`,
      affectedTargets: targets,
      effectsApplied,
      roll,
      caster,
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
  ): SpellResult {
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
  ): SpellResult {
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
  ): SpellResult {
    const currentRound = battleState.getCurrentRound();
    const target = targets[0];
    if (!target) {
      return {
        success: false,
        message: "No valid target for time warp",
        affectedTargets: [],
        caster,
        spellId: this.config.id,
      };
    }

    const targetIndex = currentRound.order.indexOf(target.id);
    if (targetIndex === -1) {
      return {
        success: false,
        message: "Target not found in turn order",
        affectedTargets: [],
        caster,
        spellId: this.config.id,
      };
    }

    currentRound.order.splice(targetIndex, 0, target.id);

    return {
      success: true,
      message: `${caster.name} granted ${target.name} an extra action`,
      affectedTargets: targets,
      roll,
      caster,
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

export class AutoAttackSpell extends BaseSpell {
  constructor(id: string) {
    super({
      id,
      type: "autoattack",
      name: "Auto-Attack",
      description: "Automatically attacks the nearest enemy.",
      manaCost: 0,
      cooldown: 0,
      targetType: "SINGLE_ENEMY",
    });
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellResult {
    const target = targets[0];
    if (!target) {
      return {
        success: false,
        message: "No valid target for auto-attack",
        affectedTargets: [],
        caster,
        spellId: this.config.id,
      };
    }
    const damage = battleManager.handler.damage(
      1.5 * roll,
      "PHYSICAL",
      caster,
      target
    );

    return {
      success: true,
      message: `${caster.name} auto-attacks ${target.name} for ${damage} damage`,
      affectedTargets: [target],
      damageDealt: new Map([[target.id, damage]]),
      roll,
      caster,
      spellId: this.config.id,
    };
  }
}
