import type { DamageModule } from "../../modules/damage.module";
import type { BattleManager, Entity, SpellConfig } from "../../types";
import { BaseSpell } from "./base.spell";

export class DamageSpell extends BaseSpell {
  protected damageModule: DamageModule;

  constructor(config: SpellConfig, damageModule: DamageModule) {
    super(config);
    this.damageModule = damageModule;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ) {
    return this.damageModule.applyRawDamage(
      caster,
      targets,
      roll,
      battleManager,
      this
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, [], 0);
    const max = this.damageModule.getRawDamage(caster, [], 20);

    return `A spell that damages for ${min}-${max} damage.`;
  }
}
