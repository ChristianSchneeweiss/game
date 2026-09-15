import type {
  LibraryCategory,
  LibraryEntry,
} from "@loot-game/game/library/types";
import { isMight } from "@loot-game/game/might/might";
import { libraryFamilyLabel } from "@loot-game/game/library/types";

export const libraryCategories = [
  "spells",
  "items",
  "passives",
  "enemies",
] as const;
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
  category: LibraryCategory;
  q: string;
  tier: string;
  group: string;
  sort: (typeof librarySorts)[number];
  entry: string;
  mightMin?: number;
  mightMax?: number;
};

// Existing content taxonomy, independent of whether a definition is assessed.
const groups: Record<LibraryCategory, readonly string[]> = {
  spells: ["enemies", "allies", "everyone"],
  items: [
    "consumable",
    "material",
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
  const category =
    libraryCategories.find((value) => value === search.category) ?? "spells";
  const sorts =
    category === "spells"
      ? librarySorts.filter((value) => value !== "health")
      : category === "enemies"
        ? ["name", "tier", "health", "mightAsc", "mightDesc"]
        : ["name", "tier", "mightAsc", "mightDesc"];
  const sort =
    librarySorts.find(
      (value) => value === search.sort && sorts.includes(value),
    ) ?? "mightDesc";
  let mightMin = parseMightBound(search.mightMin);
  let mightMax = parseMightBound(search.mightMax);
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
    entries.filter((entry) => entry.category === search.category),
    search.group,
  );
  return entries
    .filter((entry) => {
      const text =
        `${entry.name} ${entry.type} ${entry.description} ${entry.group} ${entry.stats.map((stat) => stat.label).join(" ")}`.toLowerCase();
      return (
        entry.category === search.category &&
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
