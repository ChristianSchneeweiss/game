import type {
  BattleManager,
  Effect,
  Entity,
  Spell,
  SpellModule,
} from "../types";

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
  ) {
    const effectApplied = new Map<string, Effect>();
    const effect = this.getRawEffect(caster, targets, roll);

    targets.forEach((target) => {
      const realEffect = battleManager.handler.effect(
        spell,
        effect,
        caster,
        target
      );
      if (realEffect) {
        effectApplied.set(target.id, realEffect);
      }
    });

    return {
      effectApplied,
      realEffects: effectApplied.values(),
    };
  }
}
