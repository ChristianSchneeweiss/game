import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class PredatorsFocusPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "predators-focus", tier: "B" });
  }

  onApply(): void {
    this.getHolder().attributeModifiers.push({
      id: `${this.id}:critChance`,
      attribute: "critChance",
      value: 0.1,
      operation: "ADD",
    });
  }

  getDescription(): string {
    return "Gain 10 percentage points of critical chance, even without other critical-chance bonuses.";
  }
}
