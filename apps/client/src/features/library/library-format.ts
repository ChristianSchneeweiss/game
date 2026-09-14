import type { Targeting } from "@loot-game/game/tactical/types";

export function targetingLabel(targeting?: Targeting): string {
  if (!targeting) return "—";
  switch (targeting.aim) {
    case "global":
      return "Battlefield";
    case "caster":
      return "Caster";
    case "direction":
      return "Directional";
    case "tile":
      return targeting.range.min === targeting.range.max
        ? `${targeting.range.max} ${targeting.range.max === 1 ? "tile" : "tiles"}`
        : `${targeting.range.min}–${targeting.range.max} tiles`;
  }
}
