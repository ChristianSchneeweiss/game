import { nanoid } from "nanoid";
import { StatModifierEffect } from "../effect";
import { minMaxRoll } from "../min-max-roll";
import { BaseSpell } from "../spells";
import type { SpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity } from "../types";

export class CrudeStrikeSpell extends BaseSpell {
  constructor(id: string) {
    super({
      id,
      type: "crude-strike",
      name: "Crude Strike",
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
    const min = 6;
    const max = 10;
    const damage = Math.round(minMaxRoll(min, max, roll));
    const dexEffect = new StatModifierEffect(
      this,
      "DEBUFF",
      1,
      caster,
      [
        {
          id: nanoid(),
          attribute: "agility",
          value: 0.9,
          operation: "MULTIPLY",
        },
      ],
      target
    );

    const realDamage = battleManager.handler.damage(
      this,
      damage,
      "PHYSICAL",
      caster,
      target
    );
    const realEffect = battleManager.handler.effect(
      this,
      dexEffect,
      caster,
      target
    );

    return {
      damageApplied: new Map([[target.id, realDamage]]),
      roll,
      spellId: this.config.id,
      totalDamage: realDamage,
      effectsApplied: realEffect
        ? new Map([[target.id, realEffect.effectType]])
        : undefined,
    };
  }
}
