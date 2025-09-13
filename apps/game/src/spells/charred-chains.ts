import { WeakendEffect } from "../effect/weakend.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class CharredChainsSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "charred-chains",
        name: "Charred Chains",
        manaCost: 15,
        cooldown: 3,
        targetType: { enemies: Infinity, allies: 0 },
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 6,
        max: 10,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.4,
      }),
      new EffectModule(() => new WeakendEffect(2, 1.1, "MULTIPLY")),
      0.25
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A charred chains spell that damages all enemies for ${min}-${max} magical damage. ${this.effectChance * 100}% chance to curse all enemies with 10% increased damage taken.`;
  }
}
