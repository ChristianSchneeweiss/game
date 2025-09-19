import { nanoid } from "nanoid";
import { StatModifierEffect } from "../effect/stat-modifier.effect";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class TidalPulseSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "tidal-pulse",
        name: "Tidal Pulse",
        manaCost: 30,
        cooldown: 3,
        targetType: { enemies: Infinity, allies: 0 },
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 10,
        max: 16,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.4,
      }),
      new EffectModule(
        () =>
          new StatModifierEffect(
            "DEBUFF",
            [
              {
                id: nanoid(),
                attribute: "agility",
                value: -2,
                operation: "ADD",
              },
            ],
            1
          )
      ),
      0.25
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A magical pulse of tidal energy that damages up to 3 enemies for ${min}-${max} magical damage. Has a ${this.effectChance * 100}% chance to slow affected targets (DEX -2 for 1 turn).`;
  }
}
