import type { HealModule } from "../../modules/heal.module";
import type { BattleManager, Entity, SpellConfig } from "../../types";
import { BaseSpell } from "./base.spell";

export class HealingSpell extends BaseSpell {
  protected healModule: HealModule;

  constructor(config: SpellConfig, healModule: HealModule) {
    super(config);
    this.healModule = healModule;
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ) {
    return this.healModule.applyRawHeal(
      caster,
      targets,
      roll,
      battleManager,
      this
    );
  }

  protected textDescription(caster: Entity): string {
    const min = this.healModule.getRawHeal(caster, caster, 0);
    const max = this.healModule.getRawHeal(caster, caster, 20);

    return `A spell that heals for ${min}-${max} healing.`;
  }
}
