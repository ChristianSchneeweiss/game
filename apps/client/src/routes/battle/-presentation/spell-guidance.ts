import {
  footprintTiles,
  legalCastQueries,
  potentialSelections,
  tileKey,
  type ReachableTile,
} from "@loot-game/game/tactical/queries";
import type {
  GridSetup,
  SpatialActor,
  Targeting,
  Tile,
} from "@loot-game/game/tactical/types";

/** Show spell geometry even without a target, then suggest reachable casting positions. */
export function buildSpellGuidance(
  grid: GridSetup,
  actors: readonly SpatialActor[],
  casterId: string,
  targeting: Targeting,
  reachable: readonly ReachableTile[],
): { range: Tile[]; castPositions: Tile[] } {
  const range = new Map<string, Tile>();
  for (const selection of potentialSelections(grid, casterId, targeting)) {
    const tiles =
      selection.aim === "tile"
        ? [selection.tile]
        : footprintTiles(grid, casterId, targeting, selection);
    for (const tile of tiles) range.set(tileKey(tile), tile);
  }

  const canCastHere =
    legalCastQueries(grid, actors, casterId, targeting).length > 0;
  const castPositions = canCastHere
    ? []
    : reachable
        .filter(
          ({ tile, path }) =>
            path.length > 0 &&
            legalCastQueries(
              { ...grid, positions: { ...grid.positions, [casterId]: tile } },
              actors,
              casterId,
              targeting,
            ).length > 0,
        )
        .map(({ tile }) => tile);

  return { range: [...range.values()], castPositions };
}
