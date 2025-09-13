import { ArmorDebuffEffect } from "../effect/armor-debuff.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class VerdantSmiteSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "verdant-smite",
        name: "Verdant Smite",
        manaCost: 25,
        cooldown: 3,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 18,
        max: 26,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.6,
      }),
      new EffectModule(
        () =>
          new ArmorDebuffEffect(
            {
              value: 0.85,
              operation: "MULTIPLY",
            },
            2
          )
      ),
      0.5
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A verdant smite spell that damages a single enemy for ${min}-${max} magical damage. ${this.effectChance * 100}% chance to reduce target's defense by 15% for 2 turns.`;
  }
}
