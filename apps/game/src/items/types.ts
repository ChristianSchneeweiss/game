import type { Tier } from "../types";

export interface Item {
  id: string;
  name: string;
  description: string;
  tier: Tier;
}
