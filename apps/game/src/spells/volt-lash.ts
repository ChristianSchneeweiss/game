import { StunEffect } from "../effect/stun.effect";
import { DamageModule, MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { OptionalSpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity, HandlerReturn } from "../types";
import { randomInArray } from "../utils/random-in-array";
import { BaseSpell } from "./base/base.spell";

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
    });
    this.damageModule = new MinMaxDamageModule("MAGICAL", {
      min: 8,
      max: 12,
      attributeScaling: ({ caster }) => {
        return caster.getAttribute("intelligence") * 0.4;
      },
    });

    this.effectModule = new EffectModule(() => new StunEffect(1));
    this.effectChance = 0.3;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): OptionalSpellCastEvent {
    if (!this.battleManager) throw new Error("Battle manager not set");

    const enemies = this.battleManager
      .getAliveEntities()
      .filter((e) => e.team !== caster.team);

    const events: HandlerReturn[] = [];

    for (let i = 0; i < 4; i++) {
      const randomEnemy = randomInArray(enemies, this.battleManager.getPRNG());
      const damage = this.damageModule.applyRawDamage(
        caster,
        [randomEnemy],
        roll,
        battleManager,
        this
      );
      events.push(damage);
      if (this.getRNG() < this.effectChance) {
        const effect = this.effectModule.applyRawEffect(
          caster,
          [randomEnemy],
          roll,
          battleManager,
          this
        );
        events.push(effect);
      }
    }

    return battleManager.handler.mergeHandlerReturns(events);
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `Chains lightning between up to 4 enemies, dealing ${min}-${max} magical damage to each. Each bounce has a 30% chance to stun the target.`;
  }
}
