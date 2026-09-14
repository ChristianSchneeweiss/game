import type { GridState, Tile } from "@loot-game/game/tactical/types";
import { battlefieldTiles } from "@loot-game/game/tactical/queries";
import type { BattleSession } from "../-hooks/use-battle";
import type { EncounterId } from "./encounter-presentation";
import {
  TILE_SIZE,
  selectionTile,
  tileKey,
  tileToWorld,
  worldToTile,
} from "./tactical-presentation";

const palette: Record<
  EncounterId,
  { background: string; stone: string; alternate: string; light: string }
> = {
  court: {
    background: "#111916",
    stone: "#34413b",
    alternate: "#303b34",
    light: "#edcb86",
  },
  forest: {
    background: "#101b16",
    stone: "#384934",
    alternate: "#303e2b",
    light: "#d7e4a0",
  },
  crypt: {
    background: "#12151d",
    stone: "#383b45",
    alternate: "#30333c",
    light: "#a9c6da",
  },
  ashen: {
    background: "#211411",
    stone: "#4d3830",
    alternate: "#423129",
    light: "#e99a61",
  },
  storm: {
    background: "#111823",
    stone: "#344553",
    alternate: "#2c3b49",
    light: "#9ad2ef",
  },
  tides: {
    background: "#101d21",
    stone: "#335451",
    alternate: "#2e4747",
    light: "#8ddbd0",
  },
};

/** Actual board dimensions define tiles, navigation obstacles, picking and scenery bounds. */
export function TacticalArena({
  grid,
  tactical,
  encounter,
  footprint,
}: {
  grid: GridState;
  tactical?: BattleSession["tactical"];
  encounter: EncounterId;
  footprint?: Tile[];
}) {
  const { width, height } = grid.battlefield;
  const colors = palette[encounter];
  const blocked = new Set(grid.battlefield.blocked.map(tileKey));
  const movement = new Set(
    !tactical?.targeting
      ? tactical?.reachable.map((entry) => tileKey(entry.tile))
      : [],
  );
  const origin = grid.positions[grid.activation?.entityId ?? ""];
  const anchors = new Set(
    tactical?.legal.flatMap((selection) => {
      const tile = selectionTile(selection, origin);
      return tile ? [tileKey(tile)] : [];
    }),
  );
  const spellRange = new Set(tactical?.spellGuidance?.range.map(tileKey));
  const castPositions = new Set(
    tactical?.spellGuidance?.castPositions.map(tileKey),
  );
  const area = new Set((tactical?.preview?.tiles ?? footprint)?.map(tileKey));
  const path = new Set(tactical?.path.map(tileKey));
  const threatened = new Set(tactical?.threat?.attacks.map(tileKey));
  const charged = new Set(
    tactical?.threat?.chargedRecipientIds.flatMap((id) =>
      grid.positions[id] ? [tileKey(grid.positions[id])] : [],
    ),
  );
  const halfWidth = (width * TILE_SIZE) / 2,
    halfHeight = (height * TILE_SIZE) / 2;
  return (
    <>
      <color attach="background" args={[colors.background]} />
      <ambientLight intensity={1.7} color="#d6ded5" />
      <directionalLight
        position={[-halfWidth, 18, halfHeight]}
        intensity={2.7}
        color={colors.light}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-halfWidth - 3}
        shadow-camera-right={halfWidth + 3}
        shadow-camera-top={halfHeight + 5}
        shadow-camera-bottom={-halfHeight - 5}
        shadow-bias={-0.001}
      />
      <directionalLight
        position={[halfWidth, 10, -halfHeight]}
        intensity={1.8}
        color="#86aabb"
      />
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <boxGeometry
          args={[width * TILE_SIZE + 0.6, 0.5, height * TILE_SIZE + 0.6]}
        />
        <meshStandardMaterial color="#252b26" roughness={1} />
      </mesh>
      {battlefieldTiles(grid).map((tile) => {
        const key = tileKey(tile),
          position = tileToWorld(tile, grid.battlefield);
        const color = area.has(key)
          ? "#897044"
          : path.has(key)
            ? "#558675"
            : anchors.has(key)
              ? "#56836b"
              : spellRange.has(key)
                ? "#62553a"
                : movement.has(key)
                  ? "#435f4d"
                  : (tile.x + tile.y) % 2
                    ? colors.stone
                    : colors.alternate;
        return (
          <group key={key} position={position}>
            <mesh position={[0, 0.035, 0]} receiveShadow>
              <boxGeometry
                args={[TILE_SIZE - 0.045, 0.08, TILE_SIZE - 0.045]}
              />
              <meshStandardMaterial color={color} roughness={0.95} />
            </mesh>
            {castPositions.has(key) && (
              <mesh
                rotation={[-Math.PI / 2, 0, Math.PI / 4]}
                position={[0, 0.09, 0]}
              >
                <ringGeometry
                  args={[TILE_SIZE * 0.61, TILE_SIZE * 0.66, 4]}
                />
                <meshBasicMaterial color="#8ccfff" />
              </mesh>
            )}
            {blocked.has(key) && (
              <group>
                <mesh position={[0, 0.23, 0]} castShadow>
                  <boxGeometry
                    args={[TILE_SIZE * 0.65, 0.38, TILE_SIZE * 0.65]}
                  />
                  <meshStandardMaterial color="#716d58" roughness={1} />
                </mesh>
                <mesh
                  position={[0, 0.44, 0]}
                  rotation={[-Math.PI / 2, 0, Math.PI / 4]}
                >
                  <planeGeometry args={[TILE_SIZE * 0.8, 0.11]} />
                  <meshBasicMaterial color="#d1bd80" />
                </mesh>
              </group>
            )}
            {(threatened.has(key) || charged.has(key)) && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.085, 0]}>
                <ringGeometry
                  args={[
                    0.9,
                    charged.has(key) ? 1.07 : 0.94,
                    charged.has(key) ? 32 : 4,
                  ]}
                />
                <meshBasicMaterial
                  color={charged.has(key) ? "#ef7661" : "#c28b68"}
                />
              </mesh>
            )}
          </group>
        );
      })}
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <group
            key={`${x}:${z}`}
            position={[x * (halfWidth + 0.15), 0, z * (halfHeight + 0.15)]}
          >
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.7, 0.6]} />
              <meshStandardMaterial color="#62614a" />
            </mesh>
            <mesh position={[0, 0.88, 0]}>
              <octahedronGeometry args={[0.18]} />
              <meshStandardMaterial
                color={colors.light}
                emissive={colors.light}
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        )),
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.075, 0]}
        onClick={(event) => {
          event.stopPropagation();
          const tile = worldToTile(
            event.point.x,
            event.point.z,
            grid.battlefield,
          );
          if (tile) tactical?.selectTile(tile);
        }}
      >
        <planeGeometry args={[width * TILE_SIZE, height * TILE_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
