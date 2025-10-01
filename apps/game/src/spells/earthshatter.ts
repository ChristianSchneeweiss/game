import { StunEffect } from "../effect/stun.effect";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class EarthshatterSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "earthshatter",
        name: "Earthshatter",
        manaCost: 0,
        cooldown: 4,
        targetType: { enemies: Infinity, allies: 0 },
        tier: "S",
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 16,
        max: 23,
        attributeScaling: ({ caster }) => caster.getAttribute("vitality") * 0.6,
      }),
      new EffectModule(() => new StunEffect(1)),
      0.5
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);
    const stunChance = this.effectChance;
    // const vitality = caster.getAttribute("vitality");
    // const bonusStunChance = Math.floor(vitality / 20) * 5;

    return `"The ground itself answers my call." Devastating AoE attack that damages all enemies for ${min}-${max} damage. Each enemy has a ${Math.round(stunChance * 100)}% chance to be stunned for 1 turn. If at least 2 enemies are stunned, gain +20 Armor and Magic Resistance until end of battle.`;
  }
}
