import { nanoid } from "nanoid";
import type { AttributeModifier } from "../types";
import type { Entity } from "../entity-types";
import { BasePassive } from "./base/base.passive";

export class StoneformResolvePassive extends BasePassive {
  current = 0;
  max = 15;

  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({ holder, id, passiveType: "stoneform-resolve" });
  }

  onPostRound(): void {
    if (this.current < this.max) {
      this.current++;
      this.getHolder().attributeModifiers.push(...this.createStatModifier());
    }
  }

  createStatModifier(): AttributeModifier[] {
    return [
      {
        id: nanoid(),
        attribute: "armor",
        value: 1,
        operation: "ADD",
      },
      {
        id: nanoid(),
        attribute: "magicResistance",
        value: 1,
        operation: "ADD",
      },
    ];
  }

  getDescription(): string {
    return `Increases blessed by 5.`;
  }
}
