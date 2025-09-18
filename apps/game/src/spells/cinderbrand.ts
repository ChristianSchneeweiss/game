import { DamageOverTimeEffect } from "../effect/dot.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class CinderbrandSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "cinderbrand",
        name: "Cinderbrand",
        manaCost: 15,
        cooldown: 2,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 8,
        max: 14,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.3,
      }),
      new EffectModule(() => new DamageOverTimeEffect(2, 5, "MAGICAL")),
      0.3
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `Damages a single enemy for ${min}-${max} magical damage. ${this.effectChance * 100}% chance to apply a burn for 2 turns.`;
  }
}
