import type { Entity } from "../entity-types";
import { HealModule } from "../modules/heal.module";
import { HealingSpell } from "./base/healing.spell";

export class NaturesEmbrace extends HealingSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "natures-embrace",
        name: "Nature's Embrace",
        manaCost: 35,
        cooldown: 4,
        targetType: { allies: Infinity, enemies: 0 },
        tier: "A",
      },
      new HealModule({
        min: 15,
        max: 25,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.6,
      }),
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.healModule.getRawHeal(caster, caster, 0);
    const max = this.healModule.getRawHeal(caster, caster, 20);

    return `A nature's embrace spell that heals all allies for ${min}-${max} healing.`;
  }
}
