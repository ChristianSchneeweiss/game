import { MinMaxDamageModule } from "../modules/damage.module";
import { DamageSpell } from "./base/damage.spell";

export class FireballSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "fireball",
        name: "Fireball",
        manaCost: 10,
        cooldown: 2,
        targetType: { enemies: 1, allies: 0 },
        tier: "A",
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 0,
        max: 20,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.1,
      }),
    );
  }
}
