import { DamageModule } from "../modules/damage.module";
import { DamageSpell } from "../spells";

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
      new DamageModule("FIRE", {
        min: 0,
        max: 20,
        attributeScaling: ({ caster }) => caster.getStat("intelligence") * 0.1,
      })
    );
  }
}
