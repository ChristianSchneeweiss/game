import type { Entity } from "../../entity-types";
import type { ItemType } from "../item-types";
import { IntArmor } from "./int-armor";
import { Equipment } from "./equipment";

export const itemFactory = (
  itemType: ItemType,
  id: string,
  holder: Entity,
): Equipment => {
  switch (itemType) {
    case "int-armor":
      return new IntArmor({ holder, id });
    case "iron-sword":
      return new Equipment({
        id,
        itemType,
        holderId: holder.id,
        equipmentSlot: "WEAPON",
        tier: "E",
        name: "Iron Sword",
        description: "A dependable steel blade. Increases strength by 6.",
        modifiers: [
          {
            id: `${id}:strength`,
            attribute: "strength",
            value: 6,
            operation: "ADD",
          },
        ],
      });
    case "iron-cuirass":
      return new Equipment({
        id,
        itemType,
        holderId: holder.id,
        equipmentSlot: "ARMOR",
        tier: "D",
        name: "Iron Cuirass",
        description:
          "Riveted plate and a matching shield. Increases armor by 12.",
        modifiers: [
          {
            id: `${id}:armor`,
            attribute: "armor",
            value: 12,
            operation: "ADD",
          },
        ],
      });
    case "oakwarden-staff":
      return new Equipment({
        id,
        itemType,
        holderId: holder.id,
        equipmentSlot: "WEAPON",
        tier: "D",
        name: "Oakwarden Staff",
        description:
          "Living wood cradles an emerald seed. Increases intelligence by 8.",
        modifiers: [
          {
            id: `${id}:intelligence`,
            attribute: "intelligence",
            value: 8,
            operation: "ADD",
          },
        ],
      });
    default:
      throw new Error(`Unsupported item type: ${itemType}`);
  }
};
