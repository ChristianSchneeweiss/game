import { MinMaxDamageModule } from "../modules/damage.module";
import { DamageSpell } from "./base/damage.spell";
import type { Entity } from "../entity-types";
import type { BattleManager } from "../battle-types";

export class BasicAttackSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "basic-attack",
        name: "Basic Attack",
        manaCost: 0,
        cooldown: 0,
        targetType: { enemies: 1, allies: 0 },
        tier: "A",
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 0,
        max: 15,
      }),
    );
  }

  private weaponDamage(caster: Entity): MinMaxDamageModule | undefined {
    const profile = caster.battleManager?.grid
      ? caster.weaponAttackProfile
      : undefined;
    if (!profile) return;
    return new MinMaxDamageModule(profile.damageType, {
      ...profile.baseDamage,
      attributeScaling: ({ caster }) =>
        profile.scaling.reduce(
          (total, contribution) =>
            total +
            caster.getAttribute(contribution.attribute) *
              contribution.multiplier,
          0,
        ),
    });
  }

  protected override _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number,
  ) {
    const module = this.weaponDamage(caster);
    return module
      ? module.applyRawDamage(caster, targets, roll, battleManager, this)
      : super._cast(caster, targets, battleManager, roll);
  }

  override estimateDamage(caster: Entity, target: Entity): number {
    return (this.weaponDamage(caster) ?? this.damageModule).estimateDamage(
      caster,
      target,
    );
  }

  protected override textDescription(caster: Entity): string {
    const module = this.weaponDamage(caster);
    if (!module) return super.textDescription(caster);
    const { min, max } = module.getDamageRange(caster);
    return `Attack with your weapon for ${Math.round(min)}–${Math.round(max)} ${module.type.toLowerCase()} damage.`;
  }
}
