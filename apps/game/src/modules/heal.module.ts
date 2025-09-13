import type { BattleManager, Entity, Spell } from "../types";
import { minMaxRoll } from "../utils/min-max-roll";
import type { SpellModule, SpellModuleReturn } from "./types";

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
  ): SpellModuleReturn {
    const rawHeal = this.getRawHeal(caster, targets, roll);

    const heals = targets.map((target) => {
      const heal = Math.floor(rawHeal);
      return battleManager.handler.healing(spell, heal, caster, target);
    });

    return battleManager.handler.mergeHandlerReturns(heals);
  }
}
