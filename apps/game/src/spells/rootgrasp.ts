import { StunEffect } from "../effect/stun.effect";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class RootgraspSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "rootgrasp",
        name: "Rootgrasp",
        manaCost: 15,
        cooldown: 4,
        targetType: { enemies: Infinity, allies: 0 },
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 8,
        max: 14,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.4,
      }),
      new EffectModule(() => new StunEffect(1)),
      0.4
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A rootgrasp spell that damages all enemies for ${min}-${max} magical damage. ${this.effectChance * 100}% chance to stun all enemies for 1 turn.`;
  }
}
