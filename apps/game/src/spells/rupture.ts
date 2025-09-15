import { DamageOverTimeEffect } from "../effect/dot.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class RuptureSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "rupture",
        name: "Rupture",
        manaCost: 0,
        cooldown: 1,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 8,
        max: 12,
      }),
      new EffectModule(() => new DamageOverTimeEffect(2, 4, "PHYSICAL")),
      0.2
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A rupturing attack that damages a single enemy for ${min}-${max} physical damage. Has a ${this.effectChance * 100}% chance to cause bleeding (4 damage per turn for 2 turns).`;
  }
}
