import { MinMaxDamageModule } from "../modules/damage.module";
import { DamageSpell } from "./base/damage.spell";

export class FinalVerdictSpell extends DamageSpell {
  protected executionThreshold: number = 0.1;

  constructor(id: string) {
    super(
      {
        id,
        type: "final-verdict",
        name: "Final Verdict",
        manaCost: 10,
        cooldown: 2,
        targetType: { enemies: 1, allies: 0 },
        tier: "S",
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 18,
        max: 24,
        attributeScaling: ({ caster, target }) => {
          const targetHpPercent = (target.health / target.maxHealth) * 100;
          if (targetHpPercent <= this.executionThreshold) {
            return target.maxHealth;
          }

          return caster.getAttribute("strength") * 0.8;
        },
      }),
    );
  }
}
