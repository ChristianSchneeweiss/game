import { MinMaxDamageModule } from "../modules/damage.module";
import { DamageSpell } from "./base/damage.spell";

export class CinderWispSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "cinder-wisp",
        name: "Cinder Wisp",
        manaCost: 10,
        cooldown: 1,
        targetType: { enemies: 1, allies: 0 },
        tier: "A",
      },
      new MinMaxDamageModule("MAGICAL", {
        min: 6,
        max: 12,
        attributeScaling: ({ caster }) =>
          caster.getAttribute("intelligence") * 0.2,
      }),
    );
  }

  // protected textDescription(caster: Entity): string {
  //   const min = this.damageModule.getRawDamage(caster, [], 0);
  //   const max = this.damageModule.getRawDamage(caster, [], 20);

  //   return `A cinder wisp spell that damages a single enemy for ${min}-${max} damage.`;
  // }
}
