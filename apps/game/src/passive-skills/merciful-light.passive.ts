import type { Entity } from "../entity-types";
import type { HealingHookArgs } from "../lifecycle-hooks";
import { BasePassive } from "./base/base.passive";

export class MercifulLightPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "merciful-light", tier: "C" });
  }

  beforeDealingHealing(args: HealingHookArgs): number {
    return args.defender.health <= args.defender.maxHealth * 0.5
      ? args.healing * 1.25
      : args.healing;
  }

  getDescription(): string {
    return "Your healing is 25% stronger on targets at or below 50% health, including yourself. Checked before each heal; also strengthens healing over time and lifesteal.";
  }
}
