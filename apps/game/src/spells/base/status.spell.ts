import type { EffectModule } from "../../modules/effect.module";
import type { BattleManager, Entity, SpellConfig } from "../../types";
import { BaseSpell } from "./base.spell";

export abstract class ApplyStatusSpell extends BaseSpell {
  effectModule: EffectModule;

  constructor(config: SpellConfig, effectModule: EffectModule) {
    super(config);
    this.effectModule = effectModule;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ) {
    const effects = this.effectModule.applyRawEffect(
      caster,
      targets,
      roll,
      battleManager,
      this
    );

    return effects;
  }
}
