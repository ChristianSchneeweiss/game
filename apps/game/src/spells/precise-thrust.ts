import { MinMaxDamageModule } from "../modules/damage.module";
import { DamageSpell } from "./base/damage.spell";

export class PreciseThrustSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "precise-thrust",
        name: "Precise Thrust",
        manaCost: 5,
        cooldown: 1,
        targetType: { enemies: 1, allies: 0 },
        tier: "A",
      },
      new MinMaxDamageModule("PHYSICAL", {
        min: 6,
        max: 9,
        attributeScaling: ({ caster }) => caster.getAttribute("agility") * 0.2,
      })
    );
  }

  // protected textDescription(caster: Entity): string {
  //   const min = this.damageModule.getRawDamage(caster, [], 0);
  //   const max = this.damageModule.getRawDamage(caster, [], 20);

  //   return `A cinder wisp spell that damages a single enemy for ${min}-${max} damage.`;
  // }
}
