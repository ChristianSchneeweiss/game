import { minMaxRoll } from "../min-max-roll";
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
      0,
      "PHYSICAL"
    );
  }

  protected calculateRawDamage(
    caster: Entity,
    target: Entity,
    roll: number
  ): number {
    const min = 5;
    const max = 8;
    const rolled = Math.round(minMaxRoll(min, max, roll));
    console.log(`Festering Blow rolled ${rolled}`);
    return rolled;
  }

  description(caster: Entity): string {
    const min = this.calculateRawDamage(caster, caster, 0);
    const max = this.calculateRawDamage(caster, caster, 20);

    return `A festering blow spell that damages all enemies for ${min}-${max} damage.`;
  }
}
