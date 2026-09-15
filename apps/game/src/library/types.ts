import type { EntityAttributes } from "../entity-types";
import type { Targeting } from "../tactical/types";
import {
  mightFamilyLabel,
  type MightFamily,
  type MightRating,
} from "../might/might";
import type { ItemKind } from "../items/catalog";
import type { Tier } from "../types";

export type LibraryFamily = MightFamily | "items:consumable" | "items:material";
export function libraryFamilyLabel(family: LibraryFamily) {
  if (family === "items:consumable") return "Consumables";
  if (family === "items:material") return "Materials";
  return mightFamilyLabel(family);
}
type LibraryRating =
  | MightRating
  | {
      might: null;
      tier: Tier;
      assessmentStatus: "not-applicable";
      referenceId: null;
    };

export type LibraryCategory = "spells" | "items" | "passives" | "enemies";
export type LibraryReference = { category: LibraryCategory; type: string };
export type LibraryStat = { label: string; value: string | number };
export type LibraryEntry = LibraryReference &
  LibraryRating & {
    name: string;
    description: string;
    family: LibraryFamily;
    itemKind?: ItemKind;
    group: string;
    stats: LibraryStat[];
    targeting?: Targeting;
    mana?: number;
    cooldown?: number;
    directDamage?: number;
    health?: number;
    related: LibraryReference[];
    drops?: (LibraryReference & {
      id: string;
      chance: number;
      quantity?: number;
    })[];
  };

export type LibraryAttributes = Pick<
  EntityAttributes,
  "strength" | "intelligence" | "vitality" | "agility"
>;
export const DEFAULT_LIBRARY_ATTRIBUTES: LibraryAttributes = {
  strength: 20,
  intelligence: 20,
  vitality: 20,
  agility: 20,
};
