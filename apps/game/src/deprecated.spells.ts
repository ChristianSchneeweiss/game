import { DamageOverTimeEffect } from "./effect/dot.effect";
import { HealingOverTimeEffect } from "./effect/hot.effect";
import type { DamageModule, MinMaxDamageModule } from "./modules/damage.module";
import type { HealModule } from "./modules/heal.module";
import type { OptionalSpellCastEvent, SpellCastEvent } from "./timeline-events";
import type {
  BattleManager,
  DamageType,
  Effect,
  Entity,
  Spell,
  SpellConfig,
} from "./types";

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
        effectsApplied.set(target.id, realEffect.effectType);
      }
    });

    return {
      effectsApplied,
      roll,
      spellId: this.config.id,
    };
  }

  protected textDescription(caster: Entity): string {
    return this.config.description;
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

  protected textDescription(caster: Entity): string {
    return this.config.description;
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

    const targetIndex = currentRound.orderQueue.indexOf(target.id);
    if (targetIndex === -1) {
      return null;
    }

    currentRound.orderQueue.splice(targetIndex, 0, target.id);

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
