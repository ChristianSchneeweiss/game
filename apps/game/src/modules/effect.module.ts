import type { BattleManager, Effect, Entity, Spell } from "../types";
import type { SpellModule, SpellModuleReturn } from "./types";

export class EffectModule implements SpellModule {
  constructor(
    public effectCalc: (params: {
      caster: Entity;
      targets: Entity[];
      roll: number;
    }) => Effect
  ) {}

  getRawEffect(caster: Entity, targets: Entity[], roll: number): Effect {
    return this.effectCalc({ caster, targets, roll });
  }

  applyRawEffect(
    caster: Entity,
    targets: Entity[],
    roll: number,
    battleManager: BattleManager,
    spell: Spell
  ): SpellModuleReturn {
    const effect = this.getRawEffect(caster, targets, roll);

    const effects = targets
      .map((target) => {
        return battleManager.handler.effect(spell, effect, caster, target);
      })
      .filter((effect) => effect !== null);

    return battleManager.handler.mergeHandlerReturns(effects);
  }
}
