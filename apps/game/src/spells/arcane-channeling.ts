import type { BattleManager } from "../battle-types";
import { ChargeEffect } from "../effect/charge.effect";
import type { Entity } from "../entity-types";
import { TotalDamageModule } from "../modules/damage.module";
import { EffectModule } from "../modules/effect.module";
import { BaseSpell } from "./base/base.spell";
import { survivingTargets } from "./base/targets";

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
    const damage = this.damageModule.applyRawDamage(
      args.caster,
      survivingTargets(args.caster, args.targets, this),
      args.roll,
      args.caster.battleManager,
      this,
    );
    this.battleManager.processEvent({
      eventType: "SPELL_CAST",
      data: {
        ...damage,
        spellId: this.config.id,
        origin: "delayed",
        roll: args.roll,
      },
    });
  }

  override estimateDamage(caster: Entity, target: Entity): number {
    return this.damageModule.estimateDamage(caster, target);
  }

  protected textDescription(caster: Entity): string {
    const intScaling = this.intScaling(caster);

    return `Channel for 2 turns, unable to act or move. Then deal ${Math.round(intScaling * 100)}% Intelligence damage to surviving original enemy targets still on the opposing team. Movement cannot dodge the discharge.`;
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
