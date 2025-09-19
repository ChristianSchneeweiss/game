import { HealingOverTimeEffect } from "../effect/hot.effect";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class TitansResurgencePassive extends BasePassive {
  triggered = false;
  triggerHealthPercentage = 0.3;
  healingPerRoundPercentage = 0.075;

  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "titans-resurgence" });
  }

  onPreRound(): void {
    const holder = this.getHolder();
    const healthPercentage = holder.health / holder.maxHealth;
    if (healthPercentage <= this.triggerHealthPercentage && !this.triggered) {
      this.triggered = true;
      holder.applyEffect(
        new HealingOverTimeEffect(
          4,
          holder.maxHealth * this.healingPerRoundPercentage
        )
      );
    }
  }

  getDescription(): string {
    return "Heals for 7.5% of max health for 4 rounds when health falls below 30%.";
  }
}
