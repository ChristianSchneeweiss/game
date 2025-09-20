import type { Tier } from "../types";
import type { ItemType } from "./item-types";
import type { Item } from "./types";

export abstract class BaseItem implements Item {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  itemType: ItemType;

  constructor(
    id: string,
    name: string,
    description: string,
    tier: Tier,
    itemType: ItemType
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.tier = tier;
    this.itemType = itemType;
  }
}
