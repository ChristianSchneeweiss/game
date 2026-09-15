import type { Entity } from "../entity-types";
import type { DamageHookArgs } from "../lifecycle-hooks";
import { BasePassive } from "./base/base.passive";

export class ExecutionerPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "executioner", tier: "D" });
  }

  beforeDealingDamage(args: DamageHookArgs): number {
    return args.cause === "direct" &&
      args.attacker.team !== args.defender.team &&
      args.defender.health <= args.defender.maxHealth * 0.35
      ? args.damage * 1.2
      : args.damage;
  }

  getDescription(): string {
    return "Deal 20% more direct damage to enemies at or below 35% health, before their defenses. Checked before each hit; excludes damage over time and reflected damage.";
  }
}
