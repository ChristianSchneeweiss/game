import { StunEffect } from "../effect/stun.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class StaggeringJabSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "staggering-jab",
        name: "Staggering Jab",
        manaCost: 0,
        cooldown: 1,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 4,
        max: 6,
      }),
      new EffectModule(() => new StunEffect(1)),
      0.2
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A staggering jab that damages a single enemy for ${min}-${max} damage. And has a ${this.effectChance * 100}% chance to paralyze the enemy for 1 turn.`;
  }
}
