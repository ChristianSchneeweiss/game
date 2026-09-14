import type {
  Battlefield,
  CastSelection,
  Tile,
} from "@loot-game/game/tactical/types";

export const TILE_SIZE = 2.4;
export const tileKey = (tile: Tile) => `${tile.x},${tile.y}`;
export const sameTile = (a?: Tile, b?: Tile) =>
  !!a && !!b && a.x === b.x && a.y === b.y;
export function selectionTile(
  selection?: CastSelection,
  origin?: Tile,
): Tile | undefined {
  if (selection?.aim === "tile") return selection.tile;
  if (selection?.aim === "caster") return origin;
  if (selection?.aim !== "direction" || !origin) return undefined;
  const offsets = {
    north: [0, -1],
    east: [1, 0],
    south: [0, 1],
    west: [-1, 0],
  } as const;
  const [dx, dy] = offsets[selection.direction];
  return { x: origin.x + dx, y: origin.y + dy };
}
export function tileToWorld(
  tile: Tile,
  battlefield: Pick<Battlefield, "width" | "height">,
): [number, number, number] {
  return [
    (tile.x - (battlefield.width - 1) / 2) * TILE_SIZE,
    0,
    (tile.y - (battlefield.height - 1) / 2) * TILE_SIZE,
  ];
}
export function worldToTile(
  x: number,
  z: number,
  battlefield: Pick<Battlefield, "width" | "height">,
): Tile | undefined {
  const tile = {
    x: Math.floor(x / TILE_SIZE + battlefield.width / 2),
    y: Math.floor(z / TILE_SIZE + battlefield.height / 2),
  };
  return tile.x >= 0 &&
    tile.y >= 0 &&
    tile.x < battlefield.width &&
    tile.y < battlefield.height
    ? tile
    : undefined;
}
export function gridCameraZoom(
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  return Math.min(
    viewportWidth / (width * TILE_SIZE + 4),
    viewportHeight / (height * TILE_SIZE * 0.8 + 6),
  );
}
