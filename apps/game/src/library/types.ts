import type { EntityAttributes } from "../entity-types";
import type { Targeting } from "../tactical/types";
import type { MightFamily, MightRating } from "../might/might";

export type LibraryCategory = "spells" | "items" | "passives" | "enemies";
export type LibraryReference = { category: LibraryCategory; type: string };
export type LibraryStat = { label: string; value: string | number };
export type LibraryEntry = LibraryReference &
  MightRating & {
    name: string;
    description: string;
    family: MightFamily;
    group: string;
    stats: LibraryStat[];
    targeting?: Targeting;
    mana?: number;
    cooldown?: number;
    directDamage?: number;
    health?: number;
    related: LibraryReference[];
    drops?: (LibraryReference & { chance: number })[];
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
