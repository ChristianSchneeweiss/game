import { nanoid } from "nanoid";
import type { Entity } from "../types";
import { BasePassive } from "./base/base.passive";

export class ArmorUpPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "armor-up" });
  }

  onApply(): void {
    const holder = this.getHolder();
    holder.attributeModifiers.push({
      id: nanoid(),
      attribute: "armor",
      value: 1.2,
      operation: "MULTIPLY",
    });
  }

  getDescription(): string {
    return `Increases armor by 20%.`;
  }
}
