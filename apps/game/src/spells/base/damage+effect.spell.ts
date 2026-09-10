import type { BattleManager } from "../../battle-types";
import type { Entity } from "../../entity-types";
import { DamageModule } from "../../modules/damage.module";
import type { EffectModule } from "../../modules/effect.module";
import type { OptionalSpellCastEvent } from "../../timeline-events";
import type { SpellConfig } from "../../types";
import { BaseSpell } from "./base.spell";
import { canResolveImpact } from "./targets";

type EffectRules = {
  chanceScope?: "cast" | "target";
  afterApplications?: { minimumTargets: number; effect: EffectModule };
};

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
    effectChance: number,
    private readonly effectRules: EffectRules = {},
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
    roll: number,
  ): OptionalSpellCastEvent {
    const damage = this.damageModule.applyRawDamage(
      caster,
      targets,
      roll,
      battleManager,
      this,
    );
    const eligible = targets.filter((target) =>
      canResolveImpact(caster, target),
    );
    const selected =
      this.effectRules.chanceScope === "target"
        ? eligible.filter(() => this.getRNG() < this.effectChance)
        : this.getRNG() < this.effectChance
          ? eligible
          : [];
    const effects = this.effectModule.applyRawEffect(
      caster,
      selected,
      roll,
      this,
    );
    const results = [damage, effects];
    const followup = this.effectRules.afterApplications;
    if (
      followup &&
      (effects.effectsApplied?.size ?? 0) >= followup.minimumTargets
    ) {
      results.push(
        followup.effect.applyRawEffect(caster, [caster], roll, this),
      );
    }
    return battleManager.handler.mergeHandlerReturns(results);
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A charred chains spell that damages all enemies for ${min}-${max} magical damage. ${this.effectChance * 100}% chance to curse all enemies with 10% increased damage taken.`;
  }
}
