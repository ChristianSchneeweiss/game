import { MinMaxDamageModule } from "../modules/damage.module";
import type { Entity } from "../entity-types";
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
          const targetHealthFraction = target.health / target.maxHealth;
          if (targetHealthFraction <= this.executionThreshold) {
            return target.maxHealth;
          }

          return caster.getAttribute("strength") * 0.8;
        },
      }),
    );
  }

  protected textDescription(caster: Entity): string {
    const scaling = caster.getAttribute("strength") * 0.8;
    return `Deal ${18 + scaling}-${24 + scaling} physical damage. Against a target at or below ${this.executionThreshold * 100}% health, replace Strength scaling with its maximum health before defenses and other damage effects.`;
  }
}
