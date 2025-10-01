import { StunEffect } from "../effect/stun.effect";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class BulwarkBashSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "bulwark-bash",
        name: "Bulwark Bash",
        manaCost: 0,
        cooldown: 2,
        targetType: { enemies: 1, allies: 0 },
        tier: "S",
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 10,
        max: 15,
        attributeScaling: ({ caster }) => caster.getAttribute("vitality") * 0.6,
      }),
      new EffectModule(() => new StunEffect(1)),
      1.0
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `"When steel and will collide, even mountains tremble." A powerful strike that damages a single enemy for ${min}-${max} damage and stuns the target for 1 turn.`;
  }
}
