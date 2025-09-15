import { WeakendEffect } from "../effect/weakend.effect";
import { MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { DamageEffectSpell } from "./base/damage+effect.spell";

export class TorrentSpiralSpell extends DamageEffectSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "torrent-spiral",
        name: "Torrent Spiral",
        manaCost: 20,
        cooldown: 3,
        targetType: { enemies: Infinity, allies: 0 },
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 12,
        max: 18,
        attributeScaling: ({ caster }) => caster.getAttribute("strength") * 0.3,
      }),
      new EffectModule(() => new WeakendEffect(2, 1.25, "MULTIPLY")),
      0.25
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A spiraling torrent of water that damages all enemies for ${min}-${max} physical damage. Has a ${this.effectChance * 100}% chance to inflict Soaked (Water vulnerability) for 2 turns.`;
  }
}
