import { nanoid } from "nanoid";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class SoulleechPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "soulleech", tier: "B" });
  }

  onApply(): void {
    const holder = this.getHolder();
    holder.attributeModifiers.push({
      id: nanoid(),
      attribute: "omnivamp",
      value: 0.05,
      operation: "ADD",
    });
  }

  getDescription(): string {
    return `Omnivamp +5%`;
  }
}
