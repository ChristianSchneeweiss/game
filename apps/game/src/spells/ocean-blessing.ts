import type { Entity } from "../entity-types";
import { HealModule } from "../modules/heal.module";
import { HealingSpell } from "./base/healing.spell";

export class OceanBlessingSpell extends HealingSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "ocean-blessing",
        name: "Ocean Blessing",
        manaCost: 20,
        cooldown: 3,
        targetType: { allies: 1, enemies: 0 },
      },
      new HealModule({
        min: 15,
        max: 20,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.2,
      })
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.healModule.getRawHeal(caster, caster, 0);
    const max = this.healModule.getRawHeal(caster, caster, 5);

    return `A magical blessing that heals an ally for ${min}-${max} healing.`;
  }
}
