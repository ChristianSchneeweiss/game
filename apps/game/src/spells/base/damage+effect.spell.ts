import { DamageModule } from "../../modules/damage.module";
import type { EffectModule } from "../../modules/effect.module";
import type { OptionalSpellCastEvent } from "../../timeline-events";
import type { BattleManager, Entity, SpellConfig } from "../../types";
import { BaseSpell } from "./base.spell";

/**
 * A spell that damages and has a chance to apply an effect.
 */
export abstract class DamageEffectSpell extends BaseSpell {
  damageModule: DamageModule;
  effectModule: EffectModule;
  effectChance: number;

  constructor(
    config: SpellConfig,
    damageModule: DamageModule,
    effectModule: EffectModule,
    effectChance: number
  ) {
    super(config);
    this.damageModule = damageModule;
    this.effectModule = effectModule;
    this.effectChance = effectChance;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): OptionalSpellCastEvent {
    const damage = this.damageModule.applyRawDamage(
      caster,
      targets,
      roll,
      battleManager,
      this
    );
    const rng = this.getRNG();
    console.log("rng", rng, this.effectChance);
    if (rng >= this.effectChance) return damage;

    const effects = this.effectModule.applyRawEffect(
      caster,
      targets,
      roll,
      battleManager,
      this
    );
    return battleManager.handler.mergeHandlerReturns([damage, effects]);
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A charred chains spell that damages all enemies for ${min}-${max} magical damage. ${this.effectChance * 100}% chance to curse all enemies with 10% increased damage taken.`;
  }
}
