import { BaseEffect } from "./base-effect";

export class StunEffect extends BaseEffect {
  constructor(duration: number) {
    super("STUN", duration);
  }

  onApply(): void {
    this.battleManager?.changeTurnOrder((currentOrder) => {
      if (currentOrder.includes(this.targetId)) {
        // we just trigger the end step as the real turn doesnt happen
        this.onEndStep?.();
        return currentOrder.filter((id) => id !== this.targetId);
      }
      return currentOrder;
    });
  }

  getDescription(): string {
    return "Can not act this turn";
  }
}
