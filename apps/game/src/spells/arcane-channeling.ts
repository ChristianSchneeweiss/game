import type { BattleManager } from "../battle-types";
import { ChargeEffect } from "../effect/charge.effect";
import type { Entity } from "../entity-types";
import { TotalDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { BaseSpell } from "./base/base.spell";

export class ArcaneChannelingSpell extends BaseSpell {
  damageModule = new TotalDamageModule("MAGICAL", ({ caster, target, roll }) =>
    this.calculateDamage(caster),
  );
  constructor(id: string) {
    super({
      id,
      type: "arcane-channeling",
      name: "Arcane Channeling",
      manaCost: 40,
      cooldown: 6,
      targetType: { allies: 0, enemies: Infinity },
      tier: "A",
    });
  }

  protected _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number,
  ) {
    const effectModule = new EffectModule(
      ({ caster, roll }) =>
        new ChargeEffect(2, () => this.chargeAction({ caster, roll, targets })),
    );

    return effectModule.applyRawEffect(caster, [caster], roll, this);
  }

  private chargeAction(args: {
    caster: Entity;
    roll: number;
    targets: Entity[];
  }): void {
    if (!this.validateTargets(args.caster, args.targets)) {
      return;
    }

    const damage = this.damageModule.applyRawDamage(
      args.caster,
      args.targets,
      args.roll,
      args.caster.battleManager,
      this,
    );
    this.battleManager.processEvent({
      eventType: "SPELL_CAST",
      data: {
        ...damage,
        spellId: this.config.id,
        roll: args.roll,
      },
    });
  }

  protected textDescription(caster: Entity): string {
    const intScaling = this.intScaling(caster);

    return `"The air crackles, time itself seems to freeze… until the discharge comes." Channel for 2 rounds, unable to act. Afterward, unleashes a powerful AoE attack dealing ${Math.round(intScaling * 100)}% INT damage to all enemies.`;
  }

  /**
   * Base 150% INT damage + 10% per 20 INT
   */
  private calculateDamage(caster: Entity): number {
    return caster.getAttribute("intelligence") * this.intScaling(caster);
  }

  private intScaling(caster: Entity): number {
    const intelligence = caster.getAttribute("intelligence");
    const scalingBonus = Math.floor(intelligence / 20) * 0.1; // +10% per 20 INT
    return 1.5 + scalingBonus;
  }
}
