import type { Entity } from "../entity-types";
import type { Effect, Spell } from "../types";
import type { SpellModule, SpellModuleReturn } from "./types";
import { canResolveImpact } from "../spells/base/targets";

export class EffectModule implements SpellModule {
  constructor(
    public effectCalc: (params: {
      caster: Entity;
      target: Entity;
      roll: number;
    }) => Effect,
  ) {}

  getRawEffect(caster: Entity, target: Entity, roll: number): Effect {
    let effect: Effect;
    effect = this.effectCalc({ caster, target, roll });
    return effect;
  }

  applyRawEffect(
    caster: Entity,
    targets: Entity[],
    roll: number,
    spell: Spell,
  ): SpellModuleReturn {
    const battleManager = caster.battleManager;
    const effects = targets
      .map((target) => {
        if (!canResolveImpact(caster, target)) return null;
        const effect = this.getRawEffect(caster, target, roll);
        return battleManager.handler.effect(spell, effect, caster, target);
      })
      .filter((effect) => effect !== null);

    return battleManager.handler.mergeHandlerReturns(effects);
  }
}
