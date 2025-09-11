import { minMaxRoll } from "../min-max-roll";
import type {
  BattleManager,
  DamageType,
  Entity,
  Spell,
  SpellModule,
} from "../types";

export class DamageModule implements SpellModule {
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
    },
    // if this is provided, the damageCalc is ignored. Means we skip the min-max roll and use the totalDamageCalc.
    public totalDamageCalc?: (params: {
      caster: Entity;
      targets: Entity[];
      roll: number;
    }) => number
  ) {}

  getRawDamage(caster: Entity, targets: Entity[], roll: number): number {
    if (this.totalDamageCalc) {
      return this.totalDamageCalc({ caster, targets, roll });
    }
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

  applyRawDamage(
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
