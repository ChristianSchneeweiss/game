import { ArmorDebuffEffect } from "../effect/armor-debuff.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class SplinterShotSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "splinter-shot",
        name: "Splinter Shot",
        manaCost: 0,
        cooldown: 1,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 6,
        max: 10,
      }),
      new EffectModule(
        () =>
          new ArmorDebuffEffect(
            {
              value: 0.9,
              operation: "MULTIPLY",
            },
            1
          )
      ),
      0.2
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A splinter shot spell that damages a single enemy for ${min}-${max} damage. And has a ${this.effectChance * 100}% chance to reduce the enemy's armor by 10%.`;
  }
}
