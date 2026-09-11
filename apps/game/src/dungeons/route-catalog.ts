import type { DungeonRoute, RouteAction } from "./route";

export type RouteEncounterKind =
  | "battle"
  | "elite"
  | "shrine"
  | "treasure"
  | "vault";
export type EncounterRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";
export type RouteEncounterDefinition = {
  id: string;
  name: string;
  kind: RouteEncounterKind;
  rarity: EncounterRarity;
  /** Relative selection weight, not a percentage. Zero disables an encounter. */
  weight: number;
  oncePerRun?: boolean;
  actions: readonly RouteAction[];
};
export type RouteOffer = {
  id: string;
  /** Freeze the offer so future catalog edits cannot reroll an existing run. */
  encounter: Omit<RouteEncounterDefinition, "weight" | "oncePerRun">;
};

export const routeEncounterCatalog: readonly RouteEncounterDefinition[] = [
  {
    id: "patrol",
    name: "Patrol",
    kind: "battle",
    rarity: "common",
    weight: 60,
    actions: ["continue"],
  },
  {
    id: "resting-shrine",
    name: "Resting shrine",
    kind: "shrine",
    rarity: "uncommon",
    weight: 30,
    actions: ["restore-health", "restore-mana"],
  },
  {
    id: "treasure-cache",
    name: "Treasure cache",
    kind: "treasure",
    rarity: "uncommon",
    weight: 12,
    actions: ["take-treasure", "gamble-treasure"],
  },
  {
    id: "elite-patrol",
    name: "Elite encounter",
    kind: "elite",
    rarity: "rare",
    weight: 8,
    actions: ["elite"],
  },
  {
    id: "ancient-vault",
    name: "Ancient vault",
    kind: "vault",
    rarity: "epic",
    weight: 0.5,
    oncePerRun: true,
    actions: ["open-vault"],
  },
];

/** Most forks are small; an occasional crossroads offers more possibilities. */
export const routePathCounts = [
  { count: 2, weight: 60 },
  { count: 3, weight: 30 },
  { count: 4, weight: 10 },
] as const;

function weightedIndex(
  entries: readonly { weight: number }[],
  random: () => number,
) {
  let remaining =
    random() * entries.reduce((sum, entry) => sum + entry.weight, 0);
  for (let index = 0; index < entries.length; index++) {
    remaining -= entries[index]!.weight;
    if (remaining < 0) return index;
  }
  return entries.length - 1;
}

/** Weighted sampling without replacement at each fork; unique rooms appear at most once in the run. */
export function rollDungeonRoute(
  totalEncounters: number,
  random: () => number,
  catalog = routeEncounterCatalog,
): DungeonRoute {
  const reserved = new Set<string>();
  const forks: DungeonRoute["forks"] = [];
  for (let wave = 1; wave < totalEncounters; wave++) {
    const count =
      routePathCounts[weightedIndex(routePathCounts, random)]!.count;
    const candidates = catalog.filter(
      (entry) =>
        Number.isFinite(entry.weight) &&
        entry.weight > 0 &&
        !reserved.has(entry.id),
    );
    const offers: RouteOffer[] = [];
    while (candidates.length && offers.length < count) {
      const index = weightedIndex(candidates, random);
      const [picked] = candidates.splice(index, 1);
      if (!picked) break;
      const { weight: _weight, oncePerRun, ...encounter } = picked;
      offers.push({
        id: `${wave}:${encounter.id}`,
        encounter: { ...encounter, actions: [...encounter.actions] },
      });
      if (oncePerRun) reserved.add(encounter.id);
    }
    if (!offers.length)
      throw new Error(
        "The route catalog cannot supply this expedition's forks",
      );
    forks.push({ wave, offers });
  }
  return { version: 1, forks, decisions: [] };
}
