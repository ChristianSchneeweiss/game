import { HealModule } from "../modules/heal.module";
import type { Entity } from "../types";
import { HealingSpell } from "./base/healing.spell";

export class StreamOfLifeSpell extends HealingSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "stream-of-life",
        name: "Stream of Life",
        manaCost: 10,
        cooldown: 2,
        targetType: { allies: 0, enemies: 0 },
      },
      new HealModule({
        min: 12,
        max: 18,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.4,
      })
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.healModule.getRawHeal(caster, caster, 0);
    const max = this.healModule.getRawHeal(caster, caster, 20);

    return `A spell that heals the caster for ${min}-${max} healing.`;
  }
}
