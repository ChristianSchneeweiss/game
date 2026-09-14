import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
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
        tier: "A",
      },
      new MinMaxDamageModule(
        "PHYSICAL",
        {
          min: 20,
          max: 25,
          attributeScaling: ({ caster }) =>
            caster.getAttribute("strength") * 0.6,
        },
        { chance: 0.3, ignoreDefense: 0.25 },
      ),
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `Damage ${this.battleManager?.grid ? "each enemy in the line" : "a single enemy"} for ${min}-${max} damage. Each target has a 30% chance for the attack to ignore 25% of its defense.`;
  }
}
