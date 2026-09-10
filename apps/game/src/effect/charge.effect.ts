import { BaseEffect } from "./base-effect";

/**
 * Behaves like a stun effect but with a custom action that is triggered when the effect is removed.
 */
export class ChargeEffect extends BaseEffect {
  preventsAction = true;
  constructor(
    duration: number,
    private action: () => void,
  ) {
    super("CHARGE", duration);
  }

  onRemove(): void {
    if (!this.getTarget().isDead()) this.action();
  }

  getDescription(): string {
    return "Cannot act while charging.";
  }
}
