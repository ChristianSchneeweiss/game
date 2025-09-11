import { BaseSpell } from "../spells";
import type { SpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity } from "../types";

export class AutoAttackSpell extends BaseSpell {
  constructor(id: string) {
    super({
      id,
      type: "autoattack",
      name: "Auto-Attack",
      description: "Automatically attacks the nearest enemy.",
      manaCost: 0,
      cooldown: 0,
      targetType: { enemies: 1, allies: 0 },
    });
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null {
    const target = targets[0];
    if (!target) {
      return null;
    }
    const damage = battleManager.handler.damage(
      this,
      0.75 * roll,
      "PHYSICAL",
      caster,
      target
    );

    return {
      damageApplied: new Map([[target.id, damage]]),
      roll,
      spellId: this.config.id,
      totalDamage: damage,
    };
  }

  protected textDescription(caster: Entity): string {
    const min = 0;
    const max = 15;

    return `A auto-attack spell that damages the nearest enemy for ${min}-${max} damage.`;
  }
}
