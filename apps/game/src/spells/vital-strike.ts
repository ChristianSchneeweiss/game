import { DamageModule } from "../modules/damage.module";
import { HealModule } from "../modules/heal.module";
import { BaseSpell } from "../spells";
import type { SpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity } from "../types";

export class VitalStrikeSpell extends BaseSpell {
  protected damageModule: DamageModule;

  constructor(id: string) {
    super({
      id,
      type: "vital-strike",
      name: "Vital Strike",
      description: "A vital strike spell that damages all enemies.",
      manaCost: 0,
      cooldown: 2,
      targetType: { enemies: 1, allies: 0 },
    });
    this.damageModule = new DamageModule("PHYSICAL", {
      min: 10,
      max: 16,
      attributeScaling: ({ caster }) => caster.getStat("strength") * 0.25,
    });
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): SpellCastEvent["data"] | null {
    const { damageApplied, totalDamage } = this.damageModule.applyRawDamage(
      caster,
      targets,
      roll,
      battleManager,
      this
    );

    const healModule = new HealModule(undefined, () => totalDamage * 0.5);
    const { healingApplied } = healModule.applyRawHeal(
      caster,
      [caster],
      roll,
      battleManager,
      this
    );

    return {
      healingApplied,
      damageApplied,
      roll,
      spellId: this.config.id,
    };
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, [], 0);
    const max = this.damageModule.getRawDamage(caster, [], 20);

    return `A vital strike spell that damages a single enemy for ${min}-${max} damage. And heals the caster for 50% of the damage dealt.`;
  }
}
