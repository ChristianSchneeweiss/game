import { nanoid } from "nanoid";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class KeenInstinctsPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "keen-instincts", tier: "A" });
  }

  onApply(): void {
    const holder = this.getHolder();
    holder.attributeModifiers.push({
      id: nanoid(),
      attribute: "critDamage",
      value: 0.5,
      operation: "ADD",
    });
    holder.attributeModifiers.push({
      id: nanoid(),
      attribute: "critChance",
      value: 1.25,
      operation: "MULTIPLY",
    });
  }

  getDescription(): string {
    return `Increases critical chance by 25% and critical damage by 50%.`;
  }
}
