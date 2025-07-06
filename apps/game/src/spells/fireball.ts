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
        targetType: "SINGLE_ENEMY",
      },
      20,
      "FIRE"
    );
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
