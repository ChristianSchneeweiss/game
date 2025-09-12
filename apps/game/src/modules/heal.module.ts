import { minMaxRoll } from "../utils/min-max-roll";
import type { BattleManager, Entity, Spell, SpellModule } from "../types";

export class HealModule implements SpellModule {
  constructor(
    public healCalc?: {
      min: number;
      max: number;
      attributeScaling?: (params: {
        caster: Entity;
        targets: Entity[];
        roll: number;
      }) => number;
    },
    // if this is provided, the healCalc is ignored. Means we skip the min-max roll and use the totalHealCalc.
    public totalHealCalc?: (params: {
      caster: Entity;
      targets: Entity[];
      roll: number;
    }) => number
  ) {}

  getRawHeal(caster: Entity, targets: Entity[], roll: number): number {
    if (this.totalHealCalc) {
      return this.totalHealCalc({ caster, targets, roll });
    }
    if (!this.healCalc) {
      throw new Error("Heal calculation module is not configured");
    }
    const baseHeal = minMaxRoll(this.healCalc.min, this.healCalc.max, roll);
    const scalingHeal =
      this.healCalc.attributeScaling?.({ caster, targets, roll }) ?? 0;
    return baseHeal + scalingHeal;
  }

  applyRawHeal(
    caster: Entity,
    targets: Entity[],
    roll: number,
    battleManager: BattleManager,
    spell: Spell
  ) {
    const healDealt = new Map<string, number>();
    const rawHeal = this.getRawHeal(caster, targets, roll);

    targets.forEach((target) => {
      const heal = Math.floor(rawHeal);
      const realHeal = battleManager.handler.healing(
        spell,
        heal,
        caster,
        target
      );
      healDealt.set(target.id, realHeal);
    });

    const totalHeal = healDealt.values().reduce((acc, curr) => acc + curr, 0);

    return {
      healingApplied: healDealt,
      totalHeal,
      rawHeal,
    };
  }
}
