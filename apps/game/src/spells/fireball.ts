import { DamageSpell } from "../spells";
import type { Entity } from "../types";

export class FireballSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "fireball",
        name: "Fireball",
        description: "A fireball spell that damages a single enemy.",
        manaCost: 10,
        cooldown: 2,
        targetType: { enemies: 1, allies: 0 },
      },
      20,
      "FIRE"
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.calculateRawDamage(caster, caster, 0);
    const max = this.calculateRawDamage(caster, caster, 20);

    return `A fireball spell that damages a single enemy for ${min}-${max} damage.`;
  }

  protected calculateRawDamage(
    caster: Entity,
    target: Entity,
    roll: number
  ): number {
    const int = caster.getStat("intelligence");
    return this.damageAmount * int * 0.05 + roll;
  }
}
