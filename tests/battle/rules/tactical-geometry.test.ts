import { describe, expect, test } from "bun:test";
import {
  FOOTPRINTS,
  SPELL_TARGETING,
  WEAPON_PROFILES,
} from "../../../apps/game/src/tactical/catalogue";
import { createEncounterGrid } from "../../../apps/game/src/tactical/encounters";
import {
  footprintTiles,
  legalSelections,
  queryCast,
  reachableTiles,
  tileKey,
} from "../../../apps/game/src/tactical/queries";
import {
  CastSelectionSchema,
  TargetingSchema,
  WeaponAttackProfileSchema,
  validateGridSetup,
  type GridSetup,
  type SpatialActor,
  type Targeting,
} from "../../../apps/game/src/tactical/types";

function board(): GridSetup {
  return {
    rulesVersion: 2,
    battlefield: {
      width: 11,
      height: 9,
      blocked: [{ x: 4, y: 4 }],
      layoutVersion: "geometry-v1",
    },
    positions: {
      caster: { x: 3, y: 4 },
      ally: { x: 3, y: 3 },
      enemy: { x: 7, y: 4 },
      corpse: { x: 2, y: 4 },
    },
  };
}
const actors: SpatialActor[] = [
  { id: "caster", team: "TEAM_A", health: 100 },
  { id: "ally", team: "TEAM_A", health: 100 },
  { id: "enemy", team: "TEAM_B", health: 100 },
  { id: "corpse", team: "TEAM_B", health: 0 },
];

describe("shared tactical geometry", () => {
  test("orthogonal paths avoid blocked/live cells, allow corpses, and stay deterministic", () => {
    const grid = board();
    const reachable = reachableTiles(grid, actors, "caster", 3);
    expect(reachable.some(({ tile }) => tileKey(tile) === "2,4")).toBe(true);
    expect(
      reachable.some(({ tile }) =>
        ["4,4", "3,3", "7,4"].includes(tileKey(tile)),
      ),
    ).toBe(false);
    expect(reachable.find(({ tile }) => tileKey(tile) === "4,5")?.path).toEqual(
      [
        { x: 3, y: 5 },
        { x: 4, y: 5 },
      ],
    );
    expect(reachableTiles(grid, actors, "caster", 3)).toEqual(reachable);
    expect(reachableTiles(grid, actors, "caster", 0)).toEqual([
      { tile: { x: 3, y: 4 }, path: [] },
    ]);
  });

  test("an empty range-3 center hits the full plus, including an enemy four steps away", () => {
    const grid = board();
    const before = structuredClone(grid);
    const result = queryCast(
      grid,
      actors,
      "caster",
      SPELL_TARGETING["rootgrasp"],
      { aim: "tile", tile: { x: 6, y: 4 } },
    );
    expect(result.legal).toBe(true);
    expect(result.recipientIds).toEqual(["enemy"]);
    expect(result.tiles).toHaveLength(5);
    expect(
      queryCast(grid, actors, "caster", SPELL_TARGETING.fireball, {
        aim: "tile",
        tile: { x: 6, y: 4 },
      }).legal,
    ).toBe(false);
    expect(grid).toEqual(before);
  });

  test("footprints clip at the actual rectangular boundary and ignore movement obstacles", () => {
    const grid = board();
    grid.positions.caster = { x: 9, y: 8 };
    grid.positions.enemy = { x: 10, y: 7 };
    const result = queryCast(
      grid,
      actors,
      "caster",
      SPELL_TARGETING["rootgrasp"],
      { aim: "tile", tile: { x: 10, y: 8 } },
    );
    expect(result.legal).toBe(true);
    expect(result.tiles.map(tileKey).sort()).toEqual(["10,7", "10,8", "9,8"]);
    const initial = board();
    initial.positions.enemy = { x: 5, y: 4 };
    expect(
      queryCast(initial, actors, "caster", SPELL_TARGETING["precise-thrust"], {
        aim: "direction",
        direction: "east",
      }).recipientIds,
    ).toEqual(["enemy"]);
  });

  test("north-authored lines rotate identically in all four cardinal directions", () => {
    const grid = board();
    const expected = {
      north: ["3,3", "3,2", "3,1"],
      east: ["4,4", "5,4", "6,4"],
      south: ["3,5", "3,6", "3,7"],
      west: ["2,4", "1,4", "0,4"],
    };
    for (const direction of ["north", "east", "south", "west"] as const) {
      expect(
        footprintTiles(grid, "caster", SPELL_TARGETING["tidepiercer-thrust"], {
          aim: "direction",
          direction,
        }).map(tileKey),
      ).toEqual(expected[direction]);
    }
  });

  test("duplicate offsets cannot duplicate recipients, and eligibility follows current teams", () => {
    const grid = board();
    grid.positions.enemy = { x: 3, y: 5 };
    const targeting: Targeting = {
      aim: "caster",
      affectedTiles: [
        [0, 1],
        [0, 1],
        [0, -1],
      ],
      recipients: "enemies",
    };
    expect(
      queryCast(grid, actors, "caster", targeting, { aim: "caster" })
        .recipientIds,
    ).toEqual(["enemy"]);
    const changed = actors.map((actor) =>
      actor.id === "ally" ? { ...actor, team: "TEAM_B" as const } : actor,
    );
    expect(
      queryCast(grid, changed, "caster", targeting, { aim: "caster" })
        .recipientIds,
    ).toEqual(["ally", "enemy"]);
    expect(grid.positions.ally).toEqual({ x: 3, y: 3 });
    expect(
      queryCast(grid, actors, "caster", SPELL_TARGETING["single-heal"], {
        aim: "tile",
        tile: grid.positions.caster!,
      }).legal,
    ).toBe(true);
  });

  test("minimum range, aim mode, empty patterns and malformed coordinates reject", () => {
    const grid = board();
    expect(
      queryCast(grid, actors, "caster", SPELL_TARGETING.fireball, {
        aim: "tile",
        tile: grid.positions.caster!,
      }).legal,
    ).toBe(false);
    expect(
      queryCast(grid, actors, "caster", SPELL_TARGETING.fireball, {
        aim: "global",
      }).legal,
    ).toBe(false);
    expect(
      CastSelectionSchema.safeParse({ aim: "tile", tile: { x: 0.5, y: 2 } })
        .success,
    ).toBe(false);
    expect(
      CastSelectionSchema.safeParse({ aim: "global", tile: { x: 0, y: 0 } })
        .success,
    ).toBe(false);
    expect(
      TargetingSchema.safeParse({
        aim: "caster",
        recipients: "enemies",
        affectedTiles: [],
      }).success,
    ).toBe(false);
    expect(
      TargetingSchema.safeParse({
        aim: "tile",
        recipients: "enemies",
        affectedTiles: FOOTPRINTS.single,
        range: { min: 3, max: 2 },
      }).success,
    ).toBe(false);
    expect(
      TargetingSchema.safeParse({
        aim: "global",
        recipients: "enemies",
        range: { min: 0, max: 1 },
      }).success,
    ).toBe(false);
  });

  test("global pools cover the rectangle, and legal aim queries do not mutate data", () => {
    const grid = board();
    const before = structuredClone({ grid, actors });
    expect(
      queryCast(grid, actors, "caster", SPELL_TARGETING["storm-pulse"], {
        aim: "global",
      }).recipientIds,
    ).toEqual(["enemy"]);
    expect(
      legalSelections(grid, actors, "caster", SPELL_TARGETING["single-heal"])
        .length,
    ).toBe(2);
    expect({ grid, actors }).toEqual(before);
  });

  test("authored defaults validate and an invalid unused cooperative slot is rejected in solo", () => {
    for (const targeting of Object.values(SPELL_TARGETING))
      expect(TargetingSchema.safeParse(targeting).success).toBe(true);
    for (const profile of Object.values(WEAPON_PROFILES))
      expect(WeaponAttackProfileSchema.safeParse(profile).success).toBe(true);
    expect(() =>
      createEncounterGrid(
        {
          layoutVersion: "invalid",
          blocked: [],
          partySlots: [
            { x: 1, y: 1 },
            { x: 9, y: 1 },
          ],
          enemySlots: [{ x: 3, y: 3 }],
        },
        [actors[0]!, actors[2]!],
      ),
    ).toThrow();
    const invalid = board();
    invalid.battlefield.width = 0;
    expect(() => validateGridSetup(invalid, actors)).toThrow();
    const missing = board();
    delete missing.positions.enemy;
    expect(() => validateGridSetup(missing, actors)).toThrow();
  });
});
