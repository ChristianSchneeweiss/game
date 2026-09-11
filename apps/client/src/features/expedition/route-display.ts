import { Flame, Gem, Landmark, Swords, Archive } from "lucide-react";
import type { RouteEncounterKind } from "@loot-game/game/dungeons/route-catalog";

export const encounterDisplay = {
  battle: { icon: Swords, short: "Patrol" },
  elite: { icon: Flame, short: "Elite" },
  shrine: { icon: Landmark, short: "Shrine" },
  treasure: { icon: Gem, short: "Treasure" },
  vault: { icon: Archive, short: "Vault" },
} satisfies Record<RouteEncounterKind, { icon: typeof Flame; short: string }>;
export const gearName = (type: string) =>
  type.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
