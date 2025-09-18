import { nanoid } from "nanoid";
import { StatModifierEffect } from "../effect/stat-modifier.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class AquaWaveSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "aqua-wave",
        name: "Aqua Wave",
        manaCost: 10,
        cooldown: 1,
        targetType: { enemies: 1, allies: 0 },
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 10,
        max: 14,
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
      0.2
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A magical wave of water that damages a single enemy for ${min}-${max} magical damage. Has a ${this.effectChance * 100}% chance to reduce target's DEX by 2 for 1 turn.`;
  }
}
