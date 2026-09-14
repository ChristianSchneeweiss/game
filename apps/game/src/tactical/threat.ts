import {
  footprintTiles,
  potentialSelections,
  reachableTiles,
  tileKey,
} from "./queries";
import type { GridSetup, SpatialActor, Targeting, Tile } from "./types";

/** Possibilities only. Charged attacks keep their recorded recipient identities separately. */
export function enemyThreat(
  grid: GridSetup,
  actors: readonly SpatialActor[],
  entityId: string,
  allowance: number,
  spells: readonly Targeting[],
): { movementTiles: Tile[]; attackTiles: Tile[]; global: boolean } {
  const destinations = reachableTiles(grid, actors, entityId, allowance);
  const attacks = spells.filter((spell) => spell.recipients !== "allies");
  const tiles = new Map<string, Tile>();
  for (const destination of destinations) {
    const projected: GridSetup = {
      ...grid,
      positions: { ...grid.positions, [entityId]: destination.tile },
    };
    for (const spell of attacks) {
      for (const selection of potentialSelections(projected, entityId, spell)) {
        for (const tile of footprintTiles(
          projected,
          entityId,
          spell,
          selection,
        ))
          tiles.set(tileKey(tile), tile);
      }
    }
  }
  return {
    movementTiles: destinations.map(({ tile }) => tile),
    attackTiles: [...tiles.values()],
    global: attacks.some(({ aim }) => aim === "global"),
  };
}
