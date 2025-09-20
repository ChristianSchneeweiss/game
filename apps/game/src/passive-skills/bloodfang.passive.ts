import { nanoid } from "nanoid";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class BloodfangPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "bloodfang", tier: "B" });
  }

  onApply(): void {
    const holder = this.getHolder();
    holder.attributeModifiers.push({
      id: nanoid(),
      attribute: "lifesteal",
      value: 0.1,
      operation: "ADD",
    });
  }

  getDescription(): string {
    return `Lifesteal +10%`;
  }
}
