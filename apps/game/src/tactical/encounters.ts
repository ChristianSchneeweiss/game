import { z } from "zod";
import type { DungeonKey } from "../dungeons/dungeon-keys";
import {
  TileSchema,
  validateGridSetup,
  type GridSetup,
  type SpatialActor,
  type Tile,
} from "./types";

export const DEFAULT_BATTLEFIELD_SIZE = 7;
export type EncounterLayout = {
  width?: number;
  height?: number;
  blocked: Tile[];
  layoutVersion: string;
  partySlots: Tile[];
  enemySlots: Tile[];
};
const EncounterLayoutSchema = z
  .object({
    width: z.int().positive().optional(),
    height: z.int().positive().optional(),
    blocked: z.array(TileSchema),
    layoutVersion: z.string().min(1),
    partySlots: z.array(TileSchema).min(2),
    enemySlots: z.array(TileSchema).min(1),
  })
  .strict();

/** Fixed authored slots: the second hero's slot stays reserved even in a solo start. */
export function createEncounterGrid(
  layout: EncounterLayout,
  actors: readonly SpatialActor[],
): GridSetup {
  const authored = EncounterLayoutSchema.parse(layout);
  const battlefield = {
    width: authored.width ?? DEFAULT_BATTLEFIELD_SIZE,
    height: authored.height ?? DEFAULT_BATTLEFIELD_SIZE,
    blocked: authored.blocked,
    layoutVersion: authored.layoutVersion,
  };
  // Validate unused slots too, so solo play cannot conceal an invalid cooperative layout.
  const slots = [...authored.partySlots, ...authored.enemySlots];
  validateGridSetup(
    {
      rulesVersion: 2,
      battlefield,
      positions: Object.fromEntries(
        slots.map((tile, index) => [`slot-${index}`, tile]),
      ),
    },
    slots.map((_, index) => ({
      id: `slot-${index}`,
      team: "TEAM_A",
      health: 1,
    })),
  );
  const next = { TEAM_A: 0, TEAM_B: 0 };
  const positions: Record<string, Tile> = {};
  for (const actor of actors) {
    const formation =
      actor.team === "TEAM_A" ? authored.partySlots : authored.enemySlots;
    const tile = formation[next[actor.team]++];
    if (!tile)
      throw new Error(
        `The encounter has too few starting slots for ${actor.team}`,
      );
    positions[actor.id] = { ...tile };
  }
  return validateGridSetup({ rulesVersion: 2, battlefield, positions }, actors);
}

function arena(
  layoutVersion: string,
  enemySlots: Tile[],
  blocked: Tile[] = [],
): EncounterLayout {
  return {
    layoutVersion,
    partySlots: [
      { x: 2, y: 5 },
      { x: 4, y: 5 },
    ],
    enemySlots,
    blocked,
  };
}
const solo = [{ x: 3, y: 2 }];
const pair = [
  { x: 2, y: 2 },
  { x: 4, y: 2 },
];

/** Every current wave has a fixed versioned formation, independent of battle randomness. */
export const ENCOUNTER_LAYOUTS: Record<DungeonKey, readonly EncounterLayout[]> =
  {
    dungeon1: [
      arena("avalanche-1-v1", solo),
      arena("avalanche-2-v1", pair, [
        { x: 0, y: 3 },
        { x: 6, y: 3 },
      ]),
    ],
    "crypt-of-forgotten-echoes": [
      arena("crypt-1-v1", pair),
      arena("crypt-2-v1", solo, [
        { x: 1, y: 3 },
        { x: 5, y: 3 },
      ]),
      arena("crypt-3-v1", pair),
      arena("crypt-4-v1", solo),
    ],
    "trial-of-the-ashen": [
      arena("ashen-1-v1", pair),
      arena("ashen-2-v1", solo),
      arena("ashen-3-v1", pair, [{ x: 3, y: 3 }]),
      arena("ashen-4-v1", solo),
    ],
    "trial-of-the-nature": [
      arena("nature-1-v1", pair),
      arena("nature-2-v1", pair, [
        { x: 1, y: 3 },
        { x: 5, y: 3 },
      ]),
      arena("nature-3-v1", solo),
      arena("nature-4-v1", pair),
      arena("nature-5-v1", solo),
    ],
    "trial-of-the-storm": [
      arena("storm-1-v1", [
        { x: 1, y: 2 },
        { x: 2, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 2 },
      ]),
      arena("storm-2-v1", pair),
      arena("storm-3-v1", solo),
      arena("storm-4-v1", solo),
      {
        width: 11,
        height: 9,
        layoutVersion: "storm-5-v1",
        blocked: [
          { x: 2, y: 4 },
          { x: 8, y: 4 },
        ],
        partySlots: [
          { x: 4, y: 7 },
          { x: 6, y: 7 },
        ],
        enemySlots: [{ x: 5, y: 2 }],
      },
    ],
    "trial-of-the-tides": [
      arena("tides-1-v1", pair),
      arena("tides-2-v1", pair),
      arena("tides-3-v1", solo),
      arena("tides-4-v1", [
        { x: 2, y: 2 },
        { x: 4, y: 2 },
        { x: 3, y: 1 },
      ]),
      arena("tides-5-v1", solo),
    ],
  };
