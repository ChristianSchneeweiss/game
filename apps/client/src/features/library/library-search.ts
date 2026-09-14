import type {
  LibraryCategory,
  LibraryEntry,
} from "@loot-game/game/library/types";

export const libraryCategories = [
  "spells",
  "items",
  "passives",
  "enemies",
] as const;
export const libraryTiers = ["S", "A", "B", "C", "D", "E"] as const;
export const librarySorts = [
  "name",
  "tier",
  "mana",
  "cooldown",
  "directDamage",
  "health",
] as const;
export type LibrarySearch = {
  category: LibraryCategory;
  q: string;
  tier: string;
  group: string;
  sort: (typeof librarySorts)[number];
  entry: string;
};

export function parseLibrarySearch(
  search: Record<string, unknown>,
): LibrarySearch {
  const category =
    libraryCategories.find((value) => value === search.category) ?? "spells";
  const sorts =
    category === "spells"
      ? librarySorts.filter((value) => value !== "health")
      : category === "enemies"
        ? ["name", "health"]
        : ["name", "tier"];
  const sort =
    librarySorts.find(
      (value) => value === search.sort && sorts.includes(value),
    ) ?? (category === "enemies" ? "name" : "tier");
  return {
    category,
    q: typeof search.q === "string" ? search.q.slice(0, 200) : "",
    tier:
      category === "enemies"
        ? "all"
        : (libraryTiers.find((value) => value === search.tier) ?? "all"),
    group: typeof search.group === "string" ? search.group : "all",
    sort,
    entry: typeof search.entry === "string" ? search.entry : "",
  };
}

export function filterLibrary(entries: LibraryEntry[], search: LibrarySearch) {
  const terms = search.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter((entry) => {
      const text =
        `${entry.name} ${entry.type} ${entry.description} ${entry.group} ${entry.stats.map((stat) => stat.label).join(" ")}`.toLowerCase();
      return (
        entry.category === search.category &&
        (search.tier === "all" || entry.tier === search.tier) &&
        (search.group === "all" || entry.group === search.group) &&
        terms.every((term) => text.includes(term))
      );
    })
    .sort((a, b) => {
      if (search.sort === "tier") {
        const rank = (entry: LibraryEntry) =>
          entry.tier ? libraryTiers.indexOf(entry.tier) : libraryTiers.length;
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
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
      return a.name.localeCompare(b.name);
    });
}
