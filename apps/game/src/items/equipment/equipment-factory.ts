import type { Entity } from "../../entity-types";
import type { EquipmentType } from "./equipment-types";
import { IntArmor } from "./int-armor";

export const equipmentFactory = (
  equipmentType: EquipmentType,
  holder: Entity,
  id: string
) => {
  switch (equipmentType) {
    case "int-armor":
      return new IntArmor({ holder, id });
  }
};
