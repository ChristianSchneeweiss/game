import { nanoid } from "nanoid";
import type { Entity } from "../../entity-types";
import { Equipment } from "./equipment";
import { EQUIPMENT_DEFINITIONS } from "./equipment-catalog";

export class IntArmor extends Equipment {
  constructor({ holder, id }: { id: string; holder: Pick<Entity, "id"> }) {
    super({
      ...EQUIPMENT_DEFINITIONS["int-armor"],
      itemType: "int-armor",
      holderId: holder.id,
      id,
      modifiers: EQUIPMENT_DEFINITIONS["int-armor"].bonuses.map((bonus) => ({
        ...bonus,
        id: nanoid(),
        operation: "ADD",
      })),
    });
  }
}
