import {
  CastSelectionSchema,
  TargetingSchema,
  TileSchema,
  type CastSelection,
  type Direction,
  type GridSetup,
  type SpatialActor,
  type Targeting,
  type Tile,
} from "./types";

export const DIRECTIONS = ["north", "east", "south", "west"] as const;
const STEPS: Record<Direction, Tile> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};
export const tileKey = ({ x, y }: Tile) => `${x},${y}`;
export const sameTile = (a: Tile, b: Tile) => a.x === b.x && a.y === b.y;
export const manhattan = (a: Tile, b: Tile) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const inBounds = (grid: GridSetup, tile: Tile) =>
  Number.isSafeInteger(tile.x) &&
  Number.isSafeInteger(tile.y) &&
  tile.x >= 0 &&
  tile.y >= 0 &&
  tile.x < grid.battlefield.width &&
  tile.y < grid.battlefield.height;

export function battlefieldTiles(grid: GridSetup): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < grid.battlefield.height; y++) {
    for (let x = 0; x < grid.battlefield.width; x++) tiles.push({ x, y });
  }
  return tiles;
}

export type ReachableTile = { tile: Tile; path: Tile[] };

/** Includes the starting cell with an empty path. Paths exclude the start, and ties use N/E/S/W. */
export function reachableTiles(
  grid: GridSetup,
  actors: readonly SpatialActor[],
  entityId: string,
  budget: number,
): ReachableTile[] {
  const start = grid.positions[entityId];
  if (
    !start ||
    !inBounds(grid, start) ||
    !Number.isFinite(budget) ||
    budget < 0 ||
    !actors.some((actor) => actor.id === entityId && actor.health > 0)
  )
    return [];
  const blocked = new Set(grid.battlefield.blocked.map(tileKey));
  for (const actor of actors) {
    const position = grid.positions[actor.id];
    if (actor.id !== entityId && actor.health > 0 && position)
      blocked.add(tileKey(position));
  }
  const reached: ReachableTile[] = [{ tile: { ...start }, path: [] }];
  const visited = new Set([tileKey(start)]);
  const limit = Math.floor(budget);
  for (let cursor = 0; cursor < reached.length; cursor++) {
    const current = reached[cursor]!;
    if (current.path.length >= limit) continue;
    for (const direction of DIRECTIONS) {
      const step = STEPS[direction];
      const tile = { x: current.tile.x + step.x, y: current.tile.y + step.y };
      const key = tileKey(tile);
      if (!inBounds(grid, tile) || blocked.has(key) || visited.has(key))
        continue;
      visited.add(key);
      reached.push({ tile, path: [...current.path, tile] });
    }
  }
  return reached;
}

function rotate(x: number, y: number, direction: Direction): Tile {
  switch (direction) {
    case "north":
      return { x, y };
    case "east":
      return { x: -y, y: x };
    case "south":
      return { x: -x, y: -y };
    case "west":
      return { x: y, y: -x };
  }
}

/** Potential cells are independent of occupancy and movement-only obstacles. */
export function footprintTiles(
  grid: GridSetup,
  casterId: string,
  targeting: Targeting,
  selection: CastSelection,
): Tile[] {
  const origin = grid.positions[casterId];
  if (!origin || selection.aim !== targeting.aim) return [];
  if (targeting.aim === "global") return battlefieldTiles(grid);
  let center = origin;
  if (targeting.aim === "tile") {
    if (selection.aim !== "tile" || !inBounds(grid, selection.tile)) return [];
    const distance = manhattan(origin, selection.tile);
    if (distance < targeting.range.min || distance > targeting.range.max)
      return [];
    center = selection.tile;
  }
  const cells = new Map<string, Tile>();
  for (const [x, y] of targeting.affectedTiles) {
    const offset =
      selection.aim === "direction"
        ? rotate(x, y, selection.direction)
        : { x, y };
    const tile = { x: center.x + offset.x, y: center.y + offset.y };
    if (inBounds(grid, tile)) cells.set(tileKey(tile), tile);
  }
  return [...cells.values()];
}

export type CastQuery = {
  legal: boolean;
  tiles: Tile[];
  recipientIds: string[];
};

/** A read-only public query, also used immediately before committing a cast. Never draws RNG. */
export function queryCast(
  grid: GridSetup,
  actors: readonly SpatialActor[],
  casterId: string,
  targeting: Targeting,
  selection: CastSelection,
): CastQuery {
  const caster = actors.find((actor) => actor.id === casterId);
  if (
    !caster ||
    caster.health <= 0 ||
    !TargetingSchema.safeParse(targeting).success ||
    !CastSelectionSchema.safeParse(selection).success ||
    selection.aim !== targeting.aim
  ) {
    return { legal: false, tiles: [], recipientIds: [] };
  }
  return resolveCast(grid, actors, caster, targeting, selection);
}

function resolveCast(
  grid: GridSetup,
  actors: readonly SpatialActor[],
  caster: SpatialActor,
  targeting: Targeting,
  selection: CastSelection,
): CastQuery {
  const tiles = footprintTiles(grid, caster.id, targeting, selection);
  const keys = new Set(tiles.map(tileKey));
  const recipientIds = actors
    .filter((actor) => {
      const position = grid.positions[actor.id];
      return (
        actor.health > 0 &&
        position &&
        keys.has(tileKey(position)) &&
        (targeting.recipients === "everyone" ||
          (targeting.recipients === "allies"
            ? actor.team === caster.team
            : actor.team !== caster.team))
      );
    })
    .map(({ id }) => id)
    .sort();
  return { legal: recipientIds.length > 0, tiles, recipientIds };
}

/** All geometrically allowed choices, including empty areas for planning/threat displays. */
export function potentialSelections(
  grid: GridSetup,
  casterId: string,
  targeting: Targeting,
): CastSelection[] {
  const origin = grid.positions[casterId];
  if (!origin) return [];
  switch (targeting.aim) {
    case "global":
      return [{ aim: "global" }];
    case "caster":
      return [{ aim: "caster" }];
    case "direction":
      return DIRECTIONS.map((direction) => ({ aim: "direction", direction }));
    case "tile":
      return battlefieldTiles(grid)
        .filter((tile) => {
          const d = manhattan(origin, tile);
          return d >= targeting.range.min && d <= targeting.range.max;
        })
        .map((tile) => ({ aim: "tile", tile }));
  }
}

export function legalSelections(
  grid: GridSetup,
  actors: readonly SpatialActor[],
  casterId: string,
  targeting: Targeting,
): CastSelection[] {
  return legalCastQueries(grid, actors, casterId, targeting).map(
    ({ selection }) => selection,
  );
}

/** Batch planning validates authoring once and returns the same resolved recipients as a commit. */
export function legalCastQueries(
  grid: GridSetup,
  actors: readonly SpatialActor[],
  casterId: string,
  targeting: Targeting,
): (CastQuery & { selection: CastSelection })[] {
  const caster = actors.find((actor) => actor.id === casterId);
  if (
    !caster ||
    caster.health <= 0 ||
    !TargetingSchema.safeParse(targeting).success
  )
    return [];
  return potentialSelections(grid, casterId, targeting).flatMap((selection) => {
    const result = resolveCast(grid, actors, caster, targeting, selection);
    return result.legal ? [{ ...result, selection }] : [];
  });
}

export function directionToTile(origin: Tile, tile: Tile): Direction | null {
  if (!TileSchema.safeParse(tile).success || manhattan(origin, tile) !== 1)
    return null;
  if (tile.x > origin.x) return "east";
  if (tile.x < origin.x) return "west";
  return tile.y > origin.y ? "south" : "north";
}

export function describeTargeting(targeting: Targeting): string {
  const recipients =
    targeting.recipients === "allies"
      ? "allies, including self"
      : targeting.recipients;
  switch (targeting.aim) {
    case "global":
      return `Global · ${recipients}`;
    case "caster":
      return `Centered on caster · ${recipients}`;
    case "direction":
      return `Choose a direction · ${recipients}`;
    case "tile":
      return `Range ${targeting.range.min}–${targeting.range.max} · ${recipients}`;
  }
}
