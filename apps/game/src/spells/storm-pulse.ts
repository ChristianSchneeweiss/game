import { DamageModule, MinMaxDamageModule } from "../modules/damage.module";
import type { OptionalSpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity } from "../types";
import { minMaxRoll } from "../utils/min-max-roll";
import { BaseSpell } from "./base/base.spell";

export class StormPulseSpell extends BaseSpell {
  damageModule: DamageModule;

  constructor(id: string) {
    super({
      id,
      type: "storm-pulse",
      name: "Storm Pulse",
      manaCost: 18,
      cooldown: 3,
      targetType: { enemies: 0, allies: 0 },
    });
    this.damageModule = new MinMaxDamageModule("PHYSICAL", {
      min: 8,
      max: 12,
      attributeScaling: ({ roll, caster }) => {
        const bonusDamageChance = 0.25;
        const baseBonusDamage = caster.getAttribute("intelligence") * 0.3;
        if (this.getRNG() < bonusDamageChance) {
          return minMaxRoll(4, 8, roll) + baseBonusDamage;
        }
        return baseBonusDamage;
      },
    });
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): OptionalSpellCastEvent {
    if (!this.battleManager) throw new Error("Battle manager not set");

    // we delete targets until we have 3
    const randomTargets = new Set(this.battleManager.getAliveEntities());
    while (randomTargets.size > 3) {
      const randomIndex = Math.floor(this.getRNG() * randomTargets.size);
      const randomTarget = Array.from(randomTargets)[randomIndex];
      if (!randomTarget) throw new Error("No random target found");
      randomTargets.delete(randomTarget);
    }

    const damage = this.damageModule.applyRawDamage(
      caster,
      Array.from(randomTargets),
      roll,
      battleManager,
      this
    );

    return damage;
  }

  protected textDescription(caster: Entity): string {
    const min = this.damageModule.getRawDamage(caster, caster, 0);
    const max = this.damageModule.getRawDamage(caster, caster, 20);

    return `A storm pulse that damages up to 3 random enemies for ${min}-${max} damage.`;
  }
}
