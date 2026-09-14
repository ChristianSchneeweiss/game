import { expect, test } from "bun:test";
import { Character, BaseEntity } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { buildTimeline } from "../../../apps/client/src/routes/battle/-presentation/timeline";
import {
  gridCameraZoom,
  tileToWorld,
  worldToTile,
} from "../../../apps/client/src/routes/battle/-presentation/tactical-presentation";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import { buildActionHistory } from "../../../apps/client/src/routes/battle/-presentation/action-history";
import { buildThreatPreview } from "../../../apps/client/src/routes/battle/-presentation/tactical-threat";

test("rectangular tile centers round-trip picking and camera framing changes independently by axis", () => {
  const battlefield = { width: 11, height: 9 };
  for (let y = 0; y < battlefield.height; y++)
    for (let x = 0; x < battlefield.width; x++) {
      const world = tileToWorld({ x, y }, battlefield);
      expect(worldToTile(world[0], world[2], battlefield)).toEqual({ x, y });
    }
  expect(worldToTile(100, 0, battlefield)).toBeUndefined();
  expect(worldToTile(0, -100, battlefield)).toBeUndefined();
  expect(gridCameraZoom(11, 9, 900, 500)).toBeLessThan(
    gridCameraZoom(7, 7, 900, 500),
  );
});

function encounter() {
  const hero = new Character(
    "hero",
    "owner",
    "Aldric",
    "TEAM_A",
    500,
    500,
    { strength: 20, intelligence: 20, vitality: 20, agility: 100 },
    0,
    1,
    0,
  );
  hero.spells = [
    createSpellFromType("attack", "basic-attack"),
    createSpellFromType("volt", "volt-lash"),
  ];
  const enemy = new BaseEntity("enemy", "Guardian", "TEAM_B", 1000, 1000, {
    strength: 10,
    intelligence: 10,
    vitality: 20,
    agility: 5,
  });
  enemy.spells = [createSpellFromType("enemy-attack", "basic-attack")];
  const bm = new BM([hero, enemy], "grid-presentation", {
    rulesVersion: 2,
    battlefield: {
      width: 11,
      height: 9,
      blocked: [{ x: 2, y: 2 }],
      layoutVersion: "presentation-v1",
    },
    positions: { hero: { x: 1, y: 1 }, enemy: { x: 4, y: 1 } },
  });
  bm.start();
  bm.preTurn();
  return { bm, hero, enemy };
}

test("saved movements, repeated strikes and team outcomes reduce exactly at every replay cursor", () => {
  const { bm, hero } = encounter();
  expect(bm.moveEntity(hero.id, { x: 3, y: 1 })).toBe(true);
  const afterMove = bm.events.length;
  bm.safeCastSpatial(hero.id, "volt", { aim: "global" });
  const frames = buildTimeline(
    bm.startEntityData,
    bm.events,
    undefined,
    bm.effectTracking,
  );
  expect(frames[0].grid?.positions.hero).toEqual({ x: 1, y: 1 });
  expect(frames[afterMove].grid?.positions.hero).toEqual({ x: 3, y: 1 });
  expect(frames[afterMove].grid?.activation?.spent).toBe(2);
  expect(frames.at(-1)?.grid?.positions).toEqual(bm.grid?.positions);
  for (const entity of bm.entities) {
    expect(frames.at(-1)?.stats.get(entity.id)?.health).toBe(entity.health);
    expect(frames.at(-1)?.stats.get(entity.id)?.mana).toBe(entity.mana);
  }
  const castFrame = frames.find(
    (frame) => frame.cue?.skillType === "volt-lash",
  )!;
  expect(castFrame.cue?.strikeOrder).toEqual([
    "enemy",
    "enemy",
    "enemy",
    "enemy",
  ]);
  const history = buildActionHistory(frames, bm.startEntityData, new Map());
  expect(
    history.find((entry) => entry.label === "Volt Lash")?.results.at(-1),
  ).toBe("Strike order: Guardian → Guardian → Guardian → Guardian");
  const changed = buildTimeline(bm.startEntityData, [
    ...bm.events,
    {
      round: 0,
      event: {
        eventType: "TEAM_CHANGE",
        data: { entityId: "enemy", team: "TEAM_A" },
      },
    },
  ]);
  expect(changed.at(-1)?.stats.get("enemy")?.team).toBe("TEAM_A");
  expect(changed.at(-1)?.grid?.positions.enemy).toEqual(
    bm.grid?.positions.enemy,
  );
});

test("enemy threat uses current movement and shared attack reach without changing combat RNG", () => {
  const { bm, enemy } = encounter();
  const before = JSON.stringify(bm.rng.state!());
  const stats = buildTimeline(bm.startEntityData, bm.events).at(-1)!.stats;
  const actors = bm.entities.map((entity) => ({
    id: entity.id,
    team: entity.team,
    health: entity.health,
    movement: 3,
  }));
  const threat = buildThreatPreview(
    bm.grid!,
    actors,
    bm.startEntityData,
    enemy.id,
    stats,
    bm.events,
    bm.effectTracking,
  )!;
  expect(threat.attacks).toContainEqual({ x: 8, y: 1 });
  expect(threat.movement).not.toContainEqual({ x: 1, y: 1 });
  expect(threat.chargedRecipientIds).toEqual([]);
  expect(JSON.stringify(bm.rng.state!())).toBe(before);
});
