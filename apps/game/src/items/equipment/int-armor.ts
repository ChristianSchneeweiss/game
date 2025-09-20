import { nanoid } from "nanoid";
import type { Entity } from "../../entity-types";
import { Equipment } from "./equipment";

export class IntArmor extends Equipment {
  constructor({ holder, id }: { id: string; holder: Entity }) {
    super({
      equipmentType: "int-armor",
      holderId: holder.id,
      id,
      equipmentSlot: "ARMOR",
      name: "Int Armor",
      description: "Increases armor by 20%.",
      modifiers: [
        {
          id: nanoid(),
          attribute: "intelligence",
          value: 10,
          operation: "ADD",
        },
      ],
    });
  }
}
