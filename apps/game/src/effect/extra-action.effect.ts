import { BaseEffect } from "./base-effect";

/**
 * Grants a character more actions in the next round.
 */
export class ExtraActionEffect extends BaseEffect {
  constructor(private extraActions: number) {
    super("BUFF", 100);
  }

  onPreRound(): void {
    this.battleManager.changeTurnOrder((currentOrder) => {
      if (currentOrder.includes(this.targetId)) {
        return [
          ...currentOrder,
          ...Array(this.extraActions).fill(this.targetId),
        ];
      }
      return currentOrder;
    });
    this.removeEffect();
  }

  getDescription(): string {
    return `Can act next turn ${this.extraActions} times.`;
  }
}
