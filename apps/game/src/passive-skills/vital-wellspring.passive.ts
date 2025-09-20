import { nanoid } from "nanoid";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class VitalWellspringPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "vital-wellspring", tier: "C" });
  }

  onApply(): void {
    const holder = this.getHolder();
    holder.attributeModifiers.push({
      id: nanoid(),
      attribute: "healthRegen",
      value: 1.25,
      operation: "MULTIPLY",
    });
  }

  getDescription(): string {
    return `Increases health regeneration by 25%.`;
  }
}
