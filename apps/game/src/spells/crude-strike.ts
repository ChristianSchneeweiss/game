import { nanoid } from "nanoid";
import { StatModifierEffect } from "../effect/stat-modifier.effect";
import { DamageModule, MinMaxDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import type { OptionalSpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity } from "../types";
import { BaseSpell } from "./base/base.spell";

export class CrudeStrikeSpell extends BaseSpell {
  damageModule: DamageModule;
  effectModule: EffectModule;

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
    this.damageModule = new MinMaxDamageModule("PHYSICAL", {
      min: 6,
      max: 10,
    });
    this.effectModule = new EffectModule(({ caster, targets }) => {
      return new StatModifierEffect(
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
        targets[0]!
      );
    });
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): OptionalSpellCastEvent {
    const damage = this.damageModule.applyRawDamage(
      caster,
      targets,
      roll,
      battleManager,
      this
    );

    const effects = this.effectModule.applyRawEffect(
      caster,
      targets,
      roll,
      battleManager,
      this
    );

    return battleManager.handler.mergeHandlerReturns([damage, effects]);
  }

  protected textDescription(caster: Entity): string {
    const min = 6;
    const max = 10;

    return `A crude strike spell that damages a single enemy for ${min}-${max} damage. And reduces the enemy's agility by 10%.`;
  }
}
