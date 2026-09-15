import type { Entity } from "../entity-types";
import type { DamageHookArgs } from "../lifecycle-hooks";
import { BasePassive } from "./base/base.passive";

export class LastBastionPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "last-bastion", tier: "C" });
  }

  beforeTakingDamage(args: DamageHookArgs): number {
    return args.defender.health <= args.defender.maxHealth * 0.35
      ? args.damage * 0.8
      : args.damage;
  }

  getDescription(): string {
    return "Take 20% less damage while at or below 35% health. Health is checked before each hit; a hit that crosses the threshold is not reduced.";
  }
}
