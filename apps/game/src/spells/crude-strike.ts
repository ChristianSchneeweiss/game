import { nanoid } from "nanoid";
import { StatModifierEffect } from "../effect/stat-modifier.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../entity-types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class CrudeStrikeSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "crude-strike",
        name: "Crude Strike",
        manaCost: 0,
        cooldown: 0,
        targetType: { enemies: 1, allies: 0 },
        tier: "A",
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 6,
        max: 10,
      }),
      new EffectModule(
        () =>
          new StatModifierEffect(
            "DEBUFF",
            [
              {
                id: nanoid(),
                attribute: "agility",
                value: -1,
                operation: "ADD",
              },
            ],
            1
          )
      ),
      0.1
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A crude strike spell that damages a single enemy for ${min}-${max} damage. And has a ${this.effectChance * 100}% chance to reduce the enemy's agility by 1.`;
  }
}
