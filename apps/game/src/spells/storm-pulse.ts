import { DamageModule, MinMaxDamageModule } from "../modules/damage.module";
import type { OptionalSpellCastEvent } from "../timeline-events";
import type { BattleManager, Entity } from "../types";
import { minMaxRoll } from "../utils/min-max-roll";
import { uniqueRandomFromArray } from "../utils/random-in-array";
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

    const randomTargets = uniqueRandomFromArray(
      this.battleManager.getAliveEntities(),
      3,
      this.battleManager.getPRNG()
    );

    const damage = this.damageModule.applyRawDamage(
      caster,
      randomTargets,
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
