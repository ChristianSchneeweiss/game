import type { DamageHookArgs } from "../lifecycle-hooks";
import { BaseEffect } from "./base-effect";

export class ReflectionEffect extends BaseEffect {
  constructor(
    duration: number,
    private reflectionPercentage: number
  ) {
    super("BUFF", duration);
  }

  beforeTakingDamage(args: DamageHookArgs): number {
    const damage = this.battleManager.handler.damage(
      this,
      args.damage * this.reflectionPercentage,
      args.type,
      this.getTarget(), // this is us the person buffed. because we are the target of the effect
      args.attacker // this is the attacker. as is it the source of the damage
    );
    this.battleManager.addEventToSpellCastBuffer({
      eventType: "EFFECT_TRIGGER",
      data: {
        effectId: this.id,
        ...damage,
      },
    });
    // return the damage we took minus the damage we reflected
    return args.damage - (damage.totalDamage ?? 0);
  }

  getDescription(): string {
    return `Reflects 50% of the damage taken back to the attacker.`;
  }
}
