import { nanoid } from "nanoid";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class MysticFlowPassive extends BasePassive {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "mystic-flow", tier: "C" });
  }

  onApply(): void {
    const holder = this.getHolder();
    holder.attributeModifiers.push({
      id: nanoid(),
      attribute: "manaRegen",
      value: 1.25,
      operation: "MULTIPLY",
    });
  }

  getDescription(): string {
    return `Increases mana regeneration by 25%.`;
  }
}
