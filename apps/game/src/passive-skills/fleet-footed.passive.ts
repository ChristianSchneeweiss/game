import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class FleetFootedPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "fleet-footed", tier: "D" });
  }

  onApply(): void {
    this.getHolder().attributeModifiers.push({
      id: `${this.id}:movement`,
      attribute: "movement",
      value: 1,
      operation: "ADD",
    });
  }

  getDescription(): string {
    return "Gain +1 movement tile per activation. Stacks with equipment movement bonuses.";
  }
}
