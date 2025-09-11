import { minMaxRoll } from "../min-max-roll";
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
        targetType: { allies: 1, enemies: 0 },
      },
      20
    );
  }

  protected calculateHealing(caster: Entity, roll: number): number {
    const min = 5;
    const max = 10;
    const rolled = Math.round(minMaxRoll(min, max, roll));
    return rolled + caster.getStat("intelligence") * 0.05;
  }

  getValidTargets(caster: Entity): Entity[] {
    const targets = super.getValidTargets(caster);
    targets.sort((a, b) => a.health - b.health);
    return targets;
  }

  protected textDescription(caster: Entity): string {
    const min = this.calculateHealing(caster, 0);
    const max = this.calculateHealing(caster, 20);

    return `A single heal spell that heals a single target for ${min}-${max} healing.`;
  }
}
