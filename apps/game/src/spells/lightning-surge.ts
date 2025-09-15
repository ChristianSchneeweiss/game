import { StunEffect } from "../effect/stun.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class LightningSurgeSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "lightning-surge",
        name: "Lightning Surge",
        manaCost: 30,
        cooldown: 3,
        targetType: { enemies: Infinity, allies: 0 },
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 15,
        max: 22,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.5,
      }),
      new EffectModule(() => new StunEffect(1)),
      0.25
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A surge of lightning that damages all enemies for ${min}-${max} magical damage. Has a ${this.effectChance * 100}% chance to paralyze targets for 1 turn.`;
  }
}
