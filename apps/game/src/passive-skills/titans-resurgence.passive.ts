import { HealingOverTimeEffect } from "../effect/hot.effect";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class TitansResurgencePassive extends BasePassive {
  triggered = false;
  triggerHealthPercentage = 0.3;
  healingPerRoundPercentage = 0.075;

  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "titans-resurgence", tier: "S" });
  }

  onPreRound(): void {
    const holder = this.getHolder();
    if (holder.isDead()) return;
    const healthPercentage = holder.health / holder.maxHealth;
    if (healthPercentage <= this.triggerHealthPercentage && !this.triggered) {
      this.triggered = true;
      const healing = this.battleManager.handler.effect(
        this,
        new HealingOverTimeEffect(
          4,
          holder.maxHealth * this.healingPerRoundPercentage,
        ),
        holder,
        holder,
      );
      if (healing)
        this.battleManager.processEvent({
          eventType: "EFFECT_TRIGGER",
          data: { effectId: this.id, ...healing },
        });
    }
  }

  getDescription(): string {
    return "Heals for 7.5% of max health for 4 affected turns when health falls below 30%.";
  }
}
