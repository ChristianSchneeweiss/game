import { DamageModule } from "../modules/damage.module";
import { DamageSpell } from "../spells";

export class AutoAttackSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "autoattack",
        name: "Auto-Attack",
        description: "Automatically attacks the nearest enemy.",
        manaCost: 0,
        cooldown: 0,
        targetType: { enemies: 1, allies: 0 },
      },
      new DamageModule("PHYSICAL", {
        min: 0,
        max: 15,
      })
    );
  }
}
