import { DamageModule } from "../modules/damage.module";
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
    const damageModule = new DamageModule("PHYSICAL", {
      min: 0,
      max: 15,
    });
    const { damageApplied, totalDamage } = damageModule.applyRawDamage(
      caster,
      targets,
      roll,
      battleManager,
      this
    );

    return {
      damageApplied,
      roll,
      spellId: this.config.id,
      totalDamage,
    };
  }

  protected textDescription(caster: Entity): string {
    const min = 0;
    const max = 15;

    return `A auto-attack spell that damages the nearest enemy for ${min}-${max} damage.`;
  }
}
