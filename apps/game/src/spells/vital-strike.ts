import { minMaxRoll } from "../min-max-roll";
import { DamageSpell } from "../spells";
import type { SpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity } from "../types";

export class VitalStrikeSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "vital-strike",
        name: "Vital Strike",
        description: "A vital strike spell that damages all enemies.",
        manaCost: 0,
        cooldown: 2,
        targetType: "SINGLE_ENEMY",
      },
      0,
      "PHYSICAL"
    );
  }

  protected calculateRawDamage(
    caster: Entity,
    target: Entity,
    roll: number
  ): number {
    const min = 10;
    const max = 16;
    const rolled = Math.round(minMaxRoll(min, max, roll));
    const intBonus = caster.getStat("strength") * 0.25;
    return rolled + intBonus;
  }

  protected realDamageHook(
    battleManager: BattleManager,
    caster: Entity,
    targets: Entity[],
    roll: number,
    damage: number
  ): Partial<SpellCastEvent["data"]> | null {
    const healing = Math.floor(damage * 0.5);
    battleManager.handler.healing(this, healing, caster, caster);
    return {
      healingApplied: new Map([[caster.id, healing]]),
    };
  }
}
