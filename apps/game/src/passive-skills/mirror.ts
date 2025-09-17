import type { DamageHookArgs, Entity } from "../types";
import { BasePassive } from "./base/base.passive";

export class MirrorPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "mirror" });
  }

  beforeTakingDamage(args: DamageHookArgs): number {
    console.log("beforeTakingDamage", args.damage);
    const damage = this.battleManager.handler.damage(
      this,
      args.damage * 0.5,
      args.type,
      this.getHolder(),
      args.source
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
    return `Reflects 50% of the damage taken back to the attacker.`;
  }
}
