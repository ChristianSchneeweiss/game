import { StunEffect } from "../effect/stun.effect";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class CrushingBlowSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "crushing-blow",
        name: "Crushing Blow",
        manaCost: 0,
        cooldown: 2,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 8,
        max: 12,
        attributeScaling: ({ caster }) => caster.getAttribute("strength") * 0.2,
      }),
      new EffectModule(() => new StunEffect(1)),
      0.3
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A crushing blow spell that damages a single enemy for ${min}-${max} damage. And has a ${this.effectChance * 100}% chance to stun the enemy for 1 turn.`;
  }
}
