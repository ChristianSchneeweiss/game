import type { Entity } from "../entity-types";
import type { BattleManager } from "../battle-types";
import type { DamageType, Spell } from "../types";
import { minMaxRoll } from "../utils/min-max-roll";
import type { SpellModule, SpellModuleReturn } from "./types";

export abstract class DamageModule implements SpellModule {
  public abstract type: DamageType;
  public abstract getRawDamage(
    caster: Entity,
    target: Entity,
    roll: number,
  ): number;

  public applyRawDamage(
    caster: Entity,
    targets: Entity[],
    roll: number,
    battleManager: BattleManager,
    spell: Spell,
  ): SpellModuleReturn {
    const returns = targets.map((target) => {
      const damage = Math.round(this.getRawDamage(caster, target, roll));
      return battleManager.handler.damage(
        spell,
        damage,
        this.type,
        caster,
        target,
      );
    });
    return battleManager.handler.mergeHandlerReturns(returns);
  }
}

export class MinMaxDamageModule extends DamageModule {
  constructor(
    public type: DamageType,
    public damageCalc?: {
      min: number;
      max: number;
      attributeScaling?: (params: {
        caster: Entity;
        target: Entity;
        roll: number;
      }) => number;
    },
  ) {
    super();
  }

  getRawDamage(caster: Entity, target: Entity, roll: number): number {
    if (!this.damageCalc) {
      throw new Error("Damage calculation module is not configured");
    }
    const baseDamage = minMaxRoll(
      this.damageCalc.min,
      this.damageCalc.max,
      roll,
    );
    const scalingDamage =
      this.damageCalc.attributeScaling?.({ caster, target, roll }) ?? 0;
    return baseDamage + scalingDamage;
  }
}

export class TotalDamageModule extends DamageModule {
  constructor(
    public type: DamageType,
    public totalDamageCalc: (params: {
      caster: Entity;
      target: Entity;
      roll: number;
    }) => number,
  ) {
    super();
  }

  getRawDamage(caster: Entity, target: Entity, roll: number): number {
    return this.totalDamageCalc({ caster, target, roll });
  }
}
