import type { Entity } from "../entity-types";
import type { DamageHookArgs } from "../lifecycle-hooks";
import { BasePassive } from "./base/base.passive";

export class ThornCarapacePassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "thorn-carapace", tier: "B" });
  }

  beforeTakingDamage(args: DamageHookArgs): number {
    console.log("beforeTakingDamage", args.damage);
    const damage = this.battleManager.handler.damage(
      this,
      args.damage * 0.2,
      args.type,
      this.getHolder(),
      args.attacker
    );
    this.battleManager.addEventToSpellCastBuffer({
      eventType: "EFFECT_TRIGGER",
      data: {
        effectId: this.id,
        ...damage,
      },
    });
    return args.damage;
  }

  getDescription(): string {
    return `Reflects 20% of the damage taken back to the attacker.`;
  }
}
