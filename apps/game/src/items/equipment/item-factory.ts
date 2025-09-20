import type { Entity } from "../../entity-types";
import type { ItemType } from "../item-types";
import { IntArmor } from "./int-armor";

export const itemFactory = (
  itemType: ItemType,
  holder: Entity,
  id: string
): IntArmor => {
  switch (itemType) {
    case "int-armor":
      return new IntArmor({ holder, id });
    default:
      throw new Error(`Unsupported item type: ${itemType}`);
  }
};
