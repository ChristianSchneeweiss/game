import { MinMaxDamageModule } from "../modules/damage.module";
import { DamageSpell } from "./base/damage.spell";

export class BasicAttackSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "basic-attack",
        name: "Basic Attack",
        description: "A basic attack that damages a single enemy.",
        manaCost: 0,
        cooldown: 0,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 0,
        max: 15,
      })
    );
  }
}
