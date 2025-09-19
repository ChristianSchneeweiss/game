import type { Entity } from "../entity-types";
import type { BattleManager } from "../battle-types";
import type { Effect, Spell } from "../types";
import type { SpellModule, SpellModuleReturn } from "./types";

export class EffectModule implements SpellModule {
  constructor(
    public effectCalc: (params: {
      caster: Entity;
      target: Entity;
      roll: number;
    }) => Effect
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
    battleManager: BattleManager,
    spell: Spell
  ): SpellModuleReturn {
    const effects = targets
      .map((target) => {
        const effect = this.getRawEffect(caster, target, roll);
        return battleManager.handler.effect(spell, effect, caster, target);
      })
      .filter((effect) => effect !== null);

    return battleManager.handler.mergeHandlerReturns(effects);
  }
}
