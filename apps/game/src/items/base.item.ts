import type { Tier } from "../types";
import type { EquipmentType } from "./equipment-types";
import type { Item } from "./types";

export abstract class BaseItem implements Item {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  itemType: EquipmentType;

  constructor(
    id: string,
    name: string,
    description: string,
    tier: Tier,
    itemType: EquipmentType,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.tier = tier;
    this.itemType = itemType;
  }
}
