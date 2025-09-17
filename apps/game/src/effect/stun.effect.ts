import { BaseEffect } from "./base-effect";

export class StunEffect extends BaseEffect {
  constructor(duration: number) {
    super("STUN", duration);
  }

  onApply(): void {
    this.battleManager?.changeTurnOrder((currentOrder) => {
      if (currentOrder.includes(this.targetId)) {
        // onApply we use a special removal because the effect is removed instantly **after** the spell cast
        // so we need to add it to the spell cast buffer
        this.duration--;
        if (this.duration <= 0) {
          this.safeRemoveEffect();
        }
        return currentOrder.filter((id) => id !== this.targetId);
      }
      return currentOrder;
    });
  }

  safeRemoveEffect(): void {
    const target = this.getTarget();
    target.removeEffect(this);
    this.battleManager?.addEventToSpellCastBuffer({
      eventType: "EFFECT_REMOVAL",
      data: {
        effectId: this.id,
      },
    });
  }

  getDescription(): string {
    return "Can not act this turn";
  }
}
