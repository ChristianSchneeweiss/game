import type { Entity } from "../entity-types";
import type { DamageHookArgs } from "../lifecycle-hooks";
import { BasePassive } from "./base/base.passive";

export class ArcaneBarrierPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "arcane-barrier", tier: "B" });
  }

  beforeTakingDamage(args: DamageHookArgs): number {
    return args.type === "MAGICAL" ? args.damage * 0.85 : args.damage;
  }

  getDescription(): string {
    return "Take 15% less magical damage after magic resistance. Also protects against magical damage over time.";
  }
}
