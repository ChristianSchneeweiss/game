import { expect, test } from "bun:test";
import { buildSpellGuidance } from "../../../apps/client/src/routes/battle/-presentation/spell-guidance";
import { SPELL_TARGETING } from "../../../apps/game/src/tactical/catalogue";
import {
  reachableTiles,
  tileKey,
} from "../../../apps/game/src/tactical/queries";
import type {
  GridSetup,
  SpatialActor,
  Targeting,
  Tile,
} from "../../../apps/game/src/tactical/types";

function encounter(): { grid: GridSetup; actors: SpatialActor[] } {
  return {
    grid: {
      rulesVersion: 2,
      battlefield: {
        width: 7,
        height: 7,
        blocked: [],
        layoutVersion: "spell-guidance",
      },
      positions: { caster: { x: 3, y: 5 }, enemy: { x: 3, y: 3 } },
    },
    actors: [
      { id: "caster", team: "TEAM_A", health: 100 },
      { id: "enemy", team: "TEAM_B", health: 100 },
    ],
  };
}

const keys = (tiles: Tile[]) => tiles.map(tileKey).sort();

test("Final Verdict shows four adjacent tiles and reachable positions beside an out-of-range enemy", () => {
  const { grid, actors } = encounter();
  const reachable = reachableTiles(grid, actors, "caster", 3);
  const before = structuredClone({ grid, actors, reachable });
  const guidance = buildSpellGuidance(
    grid,
    actors,
    "caster",
    SPELL_TARGETING["final-verdict"],
    reachable,
  );
  expect(keys(guidance.range)).toEqual(["2,5", "3,4", "3,6", "4,5"]);
  expect(keys(guidance.castPositions)).toEqual(["2,3", "3,4", "4,3"]);
  expect({ grid, actors, reachable }).toEqual(before);
});

test("casting positions respect blocked cells, occupied cells and the remaining movement budget", () => {
  const { grid, actors } = encounter();
  grid.battlefield.blocked = [{ x: 3, y: 4 }];
  grid.positions.ally = { x: 4, y: 3 };
  actors.push({ id: "ally", team: "TEAM_A", health: 100 });
  const guidance = buildSpellGuidance(
    grid,
    actors,
    "caster",
    SPELL_TARGETING["final-verdict"],
    reachableTiles(grid, actors, "caster", 3),
  );
  expect(keys(guidance.castPositions)).toEqual(["2,3"]);
  expect(guidance.range).toContainEqual({ x: 3, y: 4 });
  expect(
    buildSpellGuidance(
      grid,
      actors,
      "caster",
      SPELL_TARGETING["final-verdict"],
      reachableTiles(grid, actors, "caster", 2),
    ).castPositions,
  ).toEqual([]);
});

test("movement hints disappear when the selected spell already has a legal cast", () => {
  const { grid, actors } = encounter();
  const reachable = reachableTiles(grid, actors, "caster", 3);
  expect(
    buildSpellGuidance(
      grid,
      actors,
      "caster",
      SPELL_TARGETING.fireball,
      reachable,
    ).castPositions,
  ).toEqual([]);
  grid.positions.enemy = { x: 3, y: 4 };
  const guidance = buildSpellGuidance(
    grid,
    actors,
    "caster",
    SPELL_TARGETING["final-verdict"],
    reachableTiles(grid, actors, "caster", 3),
  );
  expect(guidance.castPositions).toEqual([]);
  expect(guidance.range).toHaveLength(4);
});

test("movement hints require a living recipient on the spell's eligible team", () => {
  const { grid, actors } = encounter();
  actors[1]!.team = "TEAM_A";
  const reachable = reachableTiles(grid, actors, "caster", 3);
  expect(
    buildSpellGuidance(
      grid,
      actors,
      "caster",
      SPELL_TARGETING["final-verdict"],
      reachable,
    ).castPositions,
  ).toEqual([]);
  const allies: Targeting = {
    ...SPELL_TARGETING["final-verdict"],
    recipients: "allies",
  };
  expect(
    keys(
      buildSpellGuidance(grid, actors, "caster", allies, reachable)
        .castPositions,
    ),
  ).toEqual(["2,3", "3,4", "4,3"]);
  actors[1]!.health = 0;
  expect(
    buildSpellGuidance(grid, actors, "caster", allies, reachable).castPositions,
  ).toEqual([]);
  actors[1]!.team = "TEAM_B";
  expect(
    buildSpellGuidance(
      grid,
      actors,
      "caster",
      SPELL_TARGETING["final-verdict"],
      reachable,
    ).castPositions,
  ).toEqual([]);
});

test("tile-aim guidance shows selectable anchors rather than the area's extended footprint", () => {
  const { grid, actors } = encounter();
  grid.positions.caster = { x: 3, y: 3 };
  grid.positions.enemy = { x: 6, y: 6 };
  grid.battlefield.blocked = [{ x: 3, y: 1 }];
  const guidance = buildSpellGuidance(
    grid,
    actors,
    "caster",
    SPELL_TARGETING.rootgrasp,
    [],
  );
  expect(guidance.range).toHaveLength(24);
  expect(guidance.range).toContainEqual({ x: 3, y: 1 });
  expect(guidance.range).not.toContainEqual({ x: 3, y: 3 });
  expect(guidance.range).not.toContainEqual({ x: 4, y: 0 });
});

test("directional guidance includes every orientation's full footprint and clips at board edges", () => {
  const { grid, actors } = encounter();
  const guidance = buildSpellGuidance(
    grid,
    actors,
    "caster",
    SPELL_TARGETING["precise-thrust"],
    [],
  );
  expect(keys(guidance.range)).toEqual([
    "1,5",
    "2,5",
    "3,3",
    "3,4",
    "3,6",
    "4,5",
    "5,5",
  ]);
  expect(guidance.castPositions).toEqual([]);
});

test("caster and global guidance cover their complete footprints without requiring occupied tiles", () => {
  const { grid, actors } = encounter();
  const ring = buildSpellGuidance(
    grid,
    actors,
    "caster",
    SPELL_TARGETING["torrent-spiral"],
    [],
  );
  expect(keys(ring.range)).toEqual([
    "2,4",
    "2,5",
    "2,6",
    "3,4",
    "3,6",
    "4,4",
    "4,5",
    "4,6",
  ]);
  const global = buildSpellGuidance(
    grid,
    actors,
    "caster",
    SPELL_TARGETING["storm-pulse"],
    [],
  );
  expect(global.range).toHaveLength(49);
  expect(global.range).toContainEqual({ x: 0, y: 0 });
  expect(global.range).toContainEqual({ x: 6, y: 6 });
});
