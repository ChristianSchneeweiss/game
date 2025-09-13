import { DamageModule, MinMaxDamageModule } from "../modules/damage.module";
import { HealModule } from "../modules/heal.module";
import type { OptionalSpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity } from "../types";
import { BaseSpell } from "./base/base.spell";

export class SoulflareSpell extends BaseSpell {
  protected damageModule: DamageModule;

  constructor(id: string) {
    super({
      id,
      type: "soulflare",
      name: "Soulflare",
      manaCost: 20,
      cooldown: 2,
      targetType: { enemies: 1, allies: 0 },
    });
    this.damageModule = new MinMaxDamageModule("MAGICAL", {
      min: 12,
      max: 20,
      attributeScaling: ({ caster }) =>
        caster.getAttribute("intelligence") * 0.8,
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

    const healModule = new HealModule(
      undefined,
      () => (damage.totalDamage ?? 0) * 0.5
    );
    const healing = healModule.applyRawHeal(
      caster,
      [caster],
      roll,
      battleManager,
      this
    );

    return battleManager.handler.mergeHandlerReturns([damage, healing]);
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A soulflare spell that damages a single enemy for ${min}-${max} magical damage. Heals the caster for 50% of the damage dealt.`;
  }
}
