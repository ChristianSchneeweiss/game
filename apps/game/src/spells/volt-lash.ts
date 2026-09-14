import type { BattleManager, HandlerReturn } from "../battle-types";
import { StunEffect } from "../effect/stun.effect";
import type { Entity } from "../entity-types";
import { DamageModule, MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { OptionalSpellCastEvent } from "../timeline-events";
import { randomInArray } from "../utils/random-in-array";
import { BaseSpell } from "./base/base.spell";
import { canResolveImpact, livingEnemies } from "./base/targets";

export class VoltLashSpell extends BaseSpell {
  damageModule: DamageModule;
  effectModule: EffectModule;
  effectChance: number;

  constructor(id: string) {
    super({
      id,
      type: "volt-lash",
      name: "Volt Lash",
      manaCost: 35,
      cooldown: 4,
      targetType: { enemies: 0, allies: 0 },
      tier: "A",
    });
    this.damageModule = new MinMaxDamageModule("MAGICAL", {
      min: 8,
      max: 12,
      attributeScaling: ({ caster }) => {
        return caster.getAttribute("intelligence") * 0.6;
      },
    });

    this.effectModule = new EffectModule(() => new StunEffect(1));
    this.effectChance = 0.3;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number,
  ): OptionalSpellCastEvent {
    if (!this.battleManager) throw new Error("Battle manager not set");

    const events: HandlerReturn[] = [];
    const strikeOrder: string[] = [];

    for (let i = 0; i < 4; i++) {
      const randomEnemy = randomInArray(
        battleManager.grid
          ? this.currentSpatialCandidates(caster)
          : livingEnemies(caster),
        this.battleManager.getPRNG(),
      );
      if (!randomEnemy) break;
      strikeOrder.push(randomEnemy.id);
      const damage = this.damageModule.applyRawDamage(
        caster,
        [randomEnemy],
        roll,
        battleManager,
        this,
      );
      events.push(damage);
      if (
        canResolveImpact(caster, randomEnemy) &&
        this.getRNG() < this.effectChance
      ) {
        const effect = this.effectModule.applyRawEffect(
          caster,
          [randomEnemy],
          roll,
          this,
        );
        events.push(effect);
      }
    }

    return {
      ...battleManager.handler.mergeHandlerReturns(events),
      ...(battleManager.grid ? { strikeOrder } : {}),
    };
  }

  override estimateDamage(caster: Entity, target: Entity): number {
    return (
      (this.damageModule.estimateDamage(caster, target) * 4) /
      Math.max(1, this.getValidTargets(caster).length)
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `Strike a random living enemy up to 4 times for ${min}-${max} magical damage per strike. The same enemy may be hit repeatedly. Each strike has a 30% chance to stun the target.`;
  }
}
