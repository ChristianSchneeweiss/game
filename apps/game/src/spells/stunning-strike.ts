import { StunEffect } from "../effect/stun.effect";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class StunningStrikeSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "stunning-strike",
        name: "Stunning Strike",
        manaCost: 0,
        cooldown: 2,
        targetType: { enemies: 1, allies: 0 },
        tier: "A",
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 12,
        max: 18,
        attributeScaling: ({ caster }) => caster.getAttribute("strength") * 0.4,
      }),
      new EffectModule(() => new StunEffect(1)),
      0.3
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A powerful strike that damages a single enemy for ${min}-${max} damage. Has a ${this.effectChance * 100}% chance to stun the target for 1 turn.`;
  }
}
