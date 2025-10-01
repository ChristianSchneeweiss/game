import type { BattleManager } from "../../battle-types";
import type { Entity } from "../../entity-types";
import type { EffectModule } from "../../modules/effect.module";
import type { SpellConfig } from "../../types";
import { BaseSpell } from "./base.spell";

export abstract class ApplyStatusSpell extends BaseSpell {
  effectModule: EffectModule;
  effectChance: number;

  constructor(
    config: SpellConfig,
    effectModule: EffectModule,
    effectChance?: number
  ) {
    super(config);
    this.effectModule = effectModule;
    this.effectChance = effectChance ?? 1;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ) {
    const rng = this.getRNG();
    if (rng >= this.effectChance) return null;

    const effects = this.effectModule.applyRawEffect(
      caster,
      targets,
      roll,
      this
    );

    return effects;
  }
}
