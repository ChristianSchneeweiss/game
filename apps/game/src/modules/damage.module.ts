import { minMaxRoll } from "../utils/min-max-roll";
import type {
  BattleManager,
  DamageType,
  Entity,
  Spell,
  SpellModule,
} from "../types";

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
  ) {
    const damageDealt = new Map<string, number>();
    const rawDamage = this.getRawDamage(caster, targets, roll);

    targets.forEach((target) => {
      const damage = Math.floor(rawDamage);
      const realDamage = battleManager.handler.damage(
        spell,
        damage,
        this.type,
        caster,
        target
      );
      damageDealt.set(target.id, realDamage);
    });

    const totalDamage = damageDealt
      .values()
      .reduce((acc, curr) => acc + curr, 0);

    return {
      damageApplied: damageDealt,
      totalDamage,
      rawDamage,
    };
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
