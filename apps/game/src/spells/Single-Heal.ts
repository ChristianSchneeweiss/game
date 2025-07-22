import { HealingSpell } from "../spells";
import type { Entity } from "../types";

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
        targetType: "SINGLE_ALLY",
      },
      20
    );
  }

  protected calculateHealing(caster: Entity): number {
    return this.healAmount * (1 + caster.getStat("intelligence") * 0.05);
  }

  getValidTargets(caster: Entity): Entity[] {
    const targets = super.getValidTargets(caster);
    targets.sort((a, b) => a.health - b.health);
    return targets;
  }
}
