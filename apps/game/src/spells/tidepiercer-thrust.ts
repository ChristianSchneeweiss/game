import { MinMaxDamageModule } from "../modules/damage.module";
import type { Entity } from "../types";
import { DamageSpell } from "./base/damage.spell";

export class TidepiercerThrustSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "tidepiercer-thrust",
        name: "Tidepiercer Thrust",
        manaCost: 25,
        cooldown: 3,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 20,
        max: 25,
        attributeScaling: ({ caster }) => caster.getAttribute("strength") * 0.6,
      })
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A tidepiercer thrust spell that damages a single enemy for ${min}-${max} damage with a 30% chance to ignore 25% of target's defense.`;
  }
}
