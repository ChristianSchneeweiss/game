import { nanoid } from "nanoid";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class BlessedFortunePassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "blessed-fortune" });
  }

  onApply(): void {
    const holder = this.getHolder();
    holder.attributeModifiers.push({
      id: nanoid(),
      attribute: "blessed",
      value: 5,
      operation: "ADD",
    });
  }

  getDescription(): string {
    return `Increases blessed by 5.`;
  }
}
