import { DamageModule } from "../modules/damage.module";
import { DamageSpell } from "../spells";

export class CinderWispSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "cinder-wisp",
        name: "Cinder Wisp",
        description: "A cinder wisp spell that damages enemies.",
        manaCost: 10,
        cooldown: 1,
        targetType: { enemies: 1, allies: 0 },
      },
      new DamageModule("FIRE", {
        min: 6,
        max: 12,
        attributeScaling: ({ caster }) => caster.getStat("intelligence") * 0.5,
      })
    );
  }

  // protected textDescription(caster: Entity): string {
  //   const min = this.damageModule.getRawDamage(caster, [], 0);
  //   const max = this.damageModule.getRawDamage(caster, [], 20);

  //   return `A cinder wisp spell that damages a single enemy for ${min}-${max} damage.`;
  // }
}
