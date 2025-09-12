import { HealModule } from "../modules/heal.module";
import type { Entity } from "../types";
import { HealingSpell } from "./base/healing.spell";

export class SingleHealSpell extends HealingSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "single-heal",
        name: "Single Heal",
        description: "A single heal spell that heals a single target.",
        manaCost: 10,
        cooldown: 2,
        targetType: { allies: 1, enemies: 0 },
      },
      new HealModule({
        min: 5,
        max: 10,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.05,
      })
    );
  }

  getValidTargets(caster: Entity): Entity[] {
    const targets = super.getValidTargets(caster);
    targets.sort((a, b) => a.health - b.health);
    return targets;
  }
}
