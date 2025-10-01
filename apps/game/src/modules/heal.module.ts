import type { Entity } from "../entity-types";
import type { Spell } from "../types";
import { minMaxRoll } from "../utils/min-max-roll";
import type { SpellModule, SpellModuleReturn } from "./types";

export class HealModule implements SpellModule {
  constructor(
    public healCalc?: {
      min: number;
      max: number;
      attributeScaling?: (params: {
        caster: Entity;
        target: Entity;
        roll: number;
      }) => number;
    },
    // if this is provided, the healCalc is ignored. Means we skip the min-max roll and use the totalHealCalc.
    public totalHealCalc?: (params: {
      caster: Entity;
      target: Entity;
      roll: number;
    }) => number
  ) {}

  getRawHeal(caster: Entity, target: Entity, roll: number): number {
    if (this.totalHealCalc) {
      return this.totalHealCalc({ caster, target, roll });
    }
    if (!this.healCalc) {
      throw new Error("Heal calculation module is not configured");
    }
    const baseHeal = minMaxRoll(this.healCalc.min, this.healCalc.max, roll);
    const scalingHeal =
      this.healCalc.attributeScaling?.({ caster, target, roll }) ?? 0;
    return baseHeal + scalingHeal;
  }

  applyRawHeal(
    caster: Entity,
    targets: Entity[],
    roll: number,
    spell: Spell
  ): SpellModuleReturn {
    const battleManager = caster.battleManager;
    const heals = targets.map((target) => {
      const heal = Math.round(this.getRawHeal(caster, target, roll));
      return battleManager.handler.healing(spell, heal, caster, target);
    });

    return battleManager.handler.mergeHandlerReturns(heals);
  }
}
