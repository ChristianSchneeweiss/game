import { MaxHpShieldEffect } from "../effect/max-hp-shield.effect";
import type { Entity } from "../entity-types";
import { EffectModule } from "../modules/effect.module";
import { ApplyStatusSpell } from "./base/status.spell";

export class AegisWallSpell extends ApplyStatusSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "aegis-wall",
        name: "Aegis Wall",
        manaCost: 35,
        cooldown: 6,
        targetType: { allies: Infinity, enemies: 0 },
        tier: "A",
      },
      new EffectModule(({ caster }) => {
        const percentage = this.scaling(caster);
        return new MaxHpShieldEffect(2, percentage);
      })
    );
  }

  protected textDescription(caster: Entity): string {
    const totalPercentage = this.scaling(caster);

    return `"The shield does not guard one – it guards all." Grants all allies a Protective Shield equal to ${totalPercentage * 100}% of your Max HP for 2 rounds. While shields are active, you gain +20 Armor and +20 Magic Resistance.`;
  }

  /**
   * 5% per 20 vitality
   */
  private scaling(caster: Entity): number {
    const basePercentage = 0.2;
    return basePercentage + (caster.getAttribute("vitality") / 20) * 0.05;
  }
}
