import { WeakendEffect } from "../effect/weakend.effect";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class TorrentSpiralSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "torrent-spiral",
        name: "Torrent Spiral",
        manaCost: 35,
        cooldown: 4,
        targetType: { enemies: Infinity, allies: 0 },
        tier: "A",
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 10,
        max: 16,
        attributeScaling: ({ caster }) => caster.getAttribute("strength") * 0.5,
      }),
      new EffectModule(() => new WeakendEffect(2, 1.25, "MULTIPLY")),
      0.25,
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A spiraling torrent of water that damages all enemies for ${min}-${max} physical damage. Has a ${this.effectChance * 100}% chance to inflict Soaked (Water vulnerability) for 2 turns.`;
  }
}
