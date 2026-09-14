import { ReflectionEffect } from "../effect/reflection.effect";
import type { Entity } from "../entity-types";
import { EffectModule } from "../modules/effect.module";
import { ApplyStatusSpell } from "./base/status.spell";

export class DeflectingStanceSpell extends ApplyStatusSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "deflecting-stance",
        name: "Deflecting Stance",
        manaCost: 25,
        cooldown: 4,
        targetType: { allies: 1, enemies: 0 },
        tier: "B",
      },
      new EffectModule(({ caster }) => {
        const reflectionPercentage = this.scaling(caster);
        return new ReflectionEffect(1, reflectionPercentage);
      }),
    );
  }

  protected textDescription(caster: Entity): string {
    const reflectionPercentage = this.scaling(caster);

    return `Protect one ally, including yourself, for 1 round: reduce incoming damage by 50% and reflect ${reflectionPercentage * 100}% back to the attacker. Does not stack with Thorn Carapace (chooses the stronger effect).`;
  }

  /**
   * Base 50% reflection + 5% per 20 vitality
   */
  private scaling(caster: Entity): number {
    const baseReflection = 0.5;
    return baseReflection + (caster.getAttribute("vitality") / 20) * 0.05;
  }
}
