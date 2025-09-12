import { MinMaxDamageModule } from "../modules/damage.module";
import { DamageSpell } from "../spells";
import type { Entity } from "../types";

export class FesteringBlowSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "festering-blow",
        name: "Festering Blow",
        description: "A festering blow spell that damages all enemies.",
        manaCost: 0,
        cooldown: 1,
        targetType: { enemies: Infinity, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 5,
        max: 8,
      })
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, [], 0);
    const max = this.damageModule.getRawDamage(caster, [], 20);

    return `A festering blow spell that damages all enemies for ${min}-${max} damage.`;
  }
}
