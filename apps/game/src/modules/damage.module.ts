import type { BattleManager, DamageType, Entity, Spell } from "../types";
import { minMaxRoll } from "../utils/min-max-roll";
import type { SpellModule, SpellModuleReturn } from "./types";

export abstract class DamageModule implements SpellModule {
  public abstract type: DamageType;
  public abstract getRawDamage(
    caster: Entity,
    targets: Entity[],
    roll: number
  ): number;

  public applyRawDamage(
    caster: Entity,
    targets: Entity[],
    roll: number,
    battleManager: BattleManager,
    spell: Spell
  ): SpellModuleReturn {
    const rawDamage = this.getRawDamage(caster, targets, roll);

    const returns = targets.map((target) => {
      const damage = Math.floor(rawDamage);
      return battleManager.handler.damage(
        spell,
        damage,
        this.type,
        caster,
        target
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
        targets: Entity[];
        roll: number;
      }) => number;
    }
  ) {
    super();
  }

  getRawDamage(caster: Entity, targets: Entity[], roll: number): number {
    if (!this.damageCalc) {
      throw new Error("Damage calculation module is not configured");
    }
    const baseDamage = minMaxRoll(
      this.damageCalc.min,
      this.damageCalc.max,
      roll
    );
    const scalingDamage =
      this.damageCalc.attributeScaling?.({ caster, targets, roll }) ?? 0;
    return baseDamage + scalingDamage;
  }
}

export class TotalDamageModule extends DamageModule {
  constructor(
    public type: DamageType,
    public totalDamageCalc: (params: {
      caster: Entity;
      targets: Entity[];
      roll: number;
    }) => number
  ) {
    super();
  }

  getRawDamage(caster: Entity, targets: Entity[], roll: number): number {
    return this.totalDamageCalc({ caster, targets, roll });
  }
}
