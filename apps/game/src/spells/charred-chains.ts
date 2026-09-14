import { WeakendEffect } from "../effect/weakend.effect";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class CharredChainsSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "charred-chains",
        name: "Charred Chains",
        manaCost: 25,
        cooldown: 3,
        targetType: { enemies: Infinity, allies: 0 },
        tier: "A",
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 15,
        max: 20,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.4,
      }),
      new EffectModule(() => new WeakendEffect(2, 1.1, "MULTIPLY")),
      0.25,
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `Damage ${this.battleManager?.grid ? "covered" : "all"} enemies for ${min}-${max} magical damage, with a ${this.effectChance * 100}% chance to increase their damage taken by 10%.`;
  }
}
