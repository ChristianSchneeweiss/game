import { minMaxRoll } from "../min-max-roll";
import { DamageSpell } from "../spells";
import type { Entity } from "../types";

export class CinderWispSpell extends DamageSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "cinder-wisp",
        name: "Cinder Wisp",
        description: "A cinder wisp spell that damages all enemies.",
        manaCost: 10,
        cooldown: 1,
        targetType: { enemies: 1, allies: 0 },
      },
      0,
      "FIRE"
    );
  }

  protected calculateRawDamage(
    caster: Entity,
    target: Entity,
    roll: number
  ): number {
    const min = 6;
    const max = 12;
    const rolled = Math.round(minMaxRoll(min, max, roll));
    const intBonus = caster.getStat("intelligence") * 0.5;
    return rolled + intBonus;
  }

  protected textDescription(caster: Entity): string {
    const min = this.calculateRawDamage(caster, caster, 0);
    const max = this.calculateRawDamage(caster, caster, 20);

    return `A cinder wisp spell that damages a single enemy for ${min}-${max} damage.`;
  }
}
