import { nanoid } from "nanoid";
import type { BattleManager, HandlerReturn } from "../battle-types";
import type { BaseEffect } from "../effect/base-effect";
import { StatModifierEffect } from "../effect/stat-modifier.effect";
import type { Entity } from "../entity-types";
import { EffectModule } from "../modules/effect.module";
import { HealModule } from "../modules/heal.module";
import type { OptionalSpellCastEvent } from "../timeline-events";
import { BaseSpell } from "./base/base.spell";

export class IronWillSpell extends BaseSpell {
  constructor(id: string) {
    super({
      id,
      type: "iron-will",
      name: "Iron Will",
      manaCost: 20,
      cooldown: 6,
      targetType: { enemies: 0, allies: 1 },
      tier: "A",
    });
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): OptionalSpellCastEvent {
    const results: HandlerReturn[] = [];
    for (const target of targets) {
      const debuffs = target.activeEffects.filter(
        (e) => e.effectType === "DEBUFF"
      );

      for (const debuff of debuffs) {
        (debuff as BaseEffect).removeEffect();
      }

      const vitality = target.getAttribute("vitality");
      const duration = vitality >= 120 ? 3 : 2;

      const buff = new StatModifierEffect(
        "BUFF",
        [
          {
            id: nanoid(),
            attribute: "magicResistance",
            value: 20,
            operation: "ADD",
          },
          {
            id: nanoid(),
            attribute: "armor",
            value: 20,
            operation: "ADD",
          },
        ],
        duration
      );

      const buffModule = new EffectModule(() => buff);
      const buffResult = buffModule.applyRawEffect(
        caster,
        [target],
        roll,
        this
      );
      results.push(buffResult);

      // Conditional healing if HP is below 30%
      const healModule = new HealModule({
        max: 0,
        min: 0,
        attributeScaling: ({ target }) => target.maxHealth * 0.1,
      });
      const currentHp = target.health;
      const maxHp = target.maxHealth;
      const hpPercentage = currentHp / maxHp;

      if (hpPercentage < 0.3) {
        const healResult = healModule.applyRawHeal(
          caster,
          [target],
          roll,
          this
        );
        results.push(healResult);
      }
    }

    return battleManager.handler.mergeHandlerReturns(results);
  }

  protected textDescription(caster: Entity): string {
    const vitality = caster.getAttribute("vitality");
    const duration = vitality >= 120 ? 3 : 2;

    return `Unyielding spirit, unbroken flesh. Cleanses all debuffs and grants +20 Magic Resistance & +20 Armor for ${duration} rounds. If HP is below 30%, also restores 10% Max HP on cast.`;
  }
}
