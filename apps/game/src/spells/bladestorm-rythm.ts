import type { BattleManager, HandlerReturn } from "../battle-types";
import type { Entity } from "../entity-types";
import { MinMaxDamageModule } from "../modules/damage.module";
import type { OptionalSpellCastEvent } from "../timeline-events";
import { BaseSpell } from "./base/base.spell";

export class BladestormRhythmSpell extends BaseSpell {
  damageModule = new MinMaxDamageModule("PHYSICAL", {
    min: 21,
    max: 27,
    attributeScaling: ({ caster }) => caster.getAttribute("agility") * 0.7,
  });

  constructor(id: string) {
    super({
      id,
      type: "bladestorm-rhythm",
      name: "Bladestorm Rhythm",
      manaCost: 15,
      cooldown: 4,
      targetType: { enemies: 1, allies: 0 },
      tier: "S",
    });
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
  ): OptionalSpellCastEvent {
    const results: HandlerReturn[] = [];
    for (const target of targets) {
      // First attack (100% damage)
      let roll = this.getRoll(caster);
      const firstAttack = this.damageModule.applyRawDamage(
        caster,
        [target],
        roll,
        battleManager,
        this,
      );
      results.push(firstAttack);

      // Second attack (100% damage)
      roll = this.getRoll(caster);
      const secondAttack = this.damageModule.applyRawDamage(
        caster,
        [target],
        roll,
        battleManager,
        this,
      );
      results.push(secondAttack);
    }

    return battleManager.handler.mergeHandlerReturns(results);
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A bladestorm rhythm spell that damages a single enemy for ${min}-${max} damage twice.`;
  }
}
