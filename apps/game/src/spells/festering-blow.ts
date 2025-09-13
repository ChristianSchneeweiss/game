import { WeakendEffect } from "../effect/weakend.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class FesteringBlowSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "festering-blow",
        name: "Festering Blow",
        manaCost: 0,
        cooldown: 1,
        targetType: { enemies: Infinity, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 5,
        max: 8,
      }),
      new EffectModule(() => new WeakendEffect(2, 1.1, "MULTIPLY")),
      0.25
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A festering blow spell that damages all enemies for ${min}-${max} damage. And has a ${this.effectChance * 100}% chance to curse all enemies with a 10% increased damage taken.`;
  }
}
