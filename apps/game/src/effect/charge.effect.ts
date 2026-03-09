import { BaseEffect } from "./base-effect";

/**
 * Behaves like a stun effect but with a custom action that is triggered when the effect is removed.
 */
export class ChargeEffect extends BaseEffect {
  constructor(
    duration: number,
    private action: () => void,
  ) {
    super("CHARGE", duration);
  }

  onApply(): void {
    this.battleManager.changeTurnOrder((currentOrder) => {
      if (currentOrder.includes(this.targetId)) {
        // onApply we use a special removal because the effect is removed instantly **after** the spell cast
        // so we need to add it to the spell cast buffer
        this.duration--;
        if (this.duration <= 0) {
          this.removeEffect();
        }
        return currentOrder.filter((id) => id !== this.targetId);
      }
      return currentOrder;
    });
  }

  removeEffect(): void {
    super.removeEffect();
    this.action();
  }

  getDescription(): string {
    return "Can act this turn. Is charging for an action.";
  }
}
