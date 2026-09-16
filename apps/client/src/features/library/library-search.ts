import type { LibraryEntry } from "@loot-game/game/library/types";
import { EquipmentTypeSchema } from "@loot-game/game/items/equipment-types";
import { isMight } from "@loot-game/game/might/might";
import { libraryFamilyLabel } from "@loot-game/game/library/types";

export const libraryCategories = [
  "spells",
  "equipment",
  "items",
  "passives",
  "enemies",
] as const;
export type LibraryTab = (typeof libraryCategories)[number];

export function libraryTab(entry: LibraryEntry): LibraryTab {
  return entry.category === "items" && entry.itemKind === "equipment"
    ? "equipment"
    : entry.category;
}
export const libraryTiers = ["S", "A", "B", "C", "D", "E", "unrated"] as const;
export const librarySorts = [
  "name",
  "tier",
  "mana",
  "cooldown",
  "directDamage",
  "health",
  "mightAsc",
  "mightDesc",
] as const;
export type LibrarySearch = {
  category: LibraryTab;
  q: string;
  tier: string;
  group: string;
  sort: (typeof librarySorts)[number];
  entry: string;
  mightMin?: number;
  mightMax?: number;
};

// Existing content taxonomy, independent of whether a definition is assessed.
const groups: Record<LibraryTab, readonly string[]> = {
  spells: ["enemies", "allies", "everyone"],
  items: ["consumable", "material"],
  equipment: [
    "weapon",
    "armor",
    "ring",
    "amulet",
    "boots",
    "gloves",
    "helmet",
    "cloak",
    "belt",
  ],
  passives: ["passive"],
  enemies: ["enemy"],
};

export function parseMightBound(value: unknown): number | undefined {
  if (isMight(value)) return value;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return isMight(number) ? number : undefined;
}

export function libraryGroup(entries: LibraryEntry[], group: string): string {
  return entries.some((entry) => entry.group === group) ? group : "all";
}

export function parseLibrarySearch(
  search: Record<string, unknown>,
): LibrarySearch {
  let category =
    libraryCategories.find((value) => value === search.category) ?? "spells";
  // Existing item links to gear keep opening the same entry in its new tab.
  if (
    category === "items" &&
    (EquipmentTypeSchema.safeParse(search.entry).success ||
      groups.equipment.includes(String(search.group)))
  )
    category = "equipment";
  const sorts =
    category === "spells"
      ? librarySorts.filter((value) => value !== "health")
      : category === "items"
        ? ["name", "tier"]
        : category === "enemies"
          ? ["name", "tier", "health", "mightAsc", "mightDesc"]
          : ["name", "tier", "mightAsc", "mightDesc"];
  const sort =
    librarySorts.find(
      (value) => value === search.sort && sorts.includes(value),
    ) ?? (category === "items" ? "name" : "mightDesc");
  let mightMin =
    category === "items" ? undefined : parseMightBound(search.mightMin);
  let mightMax =
    category === "items" ? undefined : parseMightBound(search.mightMax);
  if (mightMin !== undefined && mightMax !== undefined && mightMin > mightMax) {
    mightMin = undefined;
    mightMax = undefined;
  }
  return {
    category,
    q: typeof search.q === "string" ? search.q.slice(0, 200) : "",
    tier: libraryTiers.find((value) => value === search.tier) ?? "all",
    group: groups[category].find((value) => value === search.group) ?? "all",
    sort,
    entry: typeof search.entry === "string" ? search.entry : "",
    mightMin,
    mightMax,
  };
}

export function filterLibrary(entries: LibraryEntry[], search: LibrarySearch) {
  const terms = search.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const group = libraryGroup(
    entries.filter((entry) => libraryTab(entry) === search.category),
    search.group,
  );
  return entries
    .filter((entry) => {
      const text =
        `${entry.name} ${entry.type} ${entry.description} ${entry.group} ${entry.stats.map((stat) => stat.label).join(" ")}`.toLowerCase();
      return (
        libraryTab(entry) === search.category &&
        (search.tier === "all" ||
          (search.tier === "unrated"
            ? entry.assessmentStatus === "unrated"
            : entry.tier === search.tier)) &&
        (group === "all" || entry.group === group) &&
        (search.mightMin === undefined ||
          (entry.might !== null && entry.might >= search.mightMin)) &&
        (search.mightMax === undefined ||
          (entry.might !== null && entry.might <= search.mightMax)) &&
        terms.every((term) => text.includes(term))
      );
    })
    .sort((a, b) => {
      const byName = () =>
        a.name.localeCompare(b.name) || a.type.localeCompare(b.type);
      if (search.sort === "mightAsc" || search.sort === "mightDesc") {
        const family = libraryFamilyLabel(a.family).localeCompare(
          libraryFamilyLabel(b.family),
        );
        if (family) return family;
        if (a.might === null) return b.might === null ? byName() : 1;
        if (b.might === null) return -1;
        return (
          (a.might - b.might) * (search.sort === "mightAsc" ? 1 : -1) ||
          byName()
        );
      }
      if (search.sort === "tier") {
        const rank = (entry: LibraryEntry) =>
          entry.tier ? libraryTiers.indexOf(entry.tier) : libraryTiers.length;
        return rank(a) - rank(b) || byName();
      }
      if (search.sort !== "name") {
        const first = a[search.sort];
        const second = b[search.sort];
        if (first === undefined && second !== undefined) return 1;
        if (second === undefined && first !== undefined) return -1;
        if (first !== undefined && second !== undefined) {
          const direction =
            search.sort === "directDamage" || search.sort === "health" ? -1 : 1;
          const comparison = (first - second) * direction;
          if (comparison) return comparison;
        }
      }
      return byName();
    });
}
