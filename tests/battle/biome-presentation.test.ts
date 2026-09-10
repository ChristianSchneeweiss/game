import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import SuperJSON from "superjson";
import {
  AnimationMixer,
  Mesh,
  MeshStandardMaterial,
  Texture,
  type Object3D,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { encounterFor } from "../../apps/client/src/routes/battle/-presentation/encounter-presentation";
import {
  appearanceFor,
  dressMiniature,
} from "../../apps/client/src/routes/battle/-presentation/miniature-appearance";
import { elementalEffectFor } from "../../apps/client/src/routes/battle/-presentation/spell-appearance";
import { miniatureFor } from "../../apps/client/src/routes/battle/-presentation/visual-manifest";
import { buildTimeline } from "../../apps/client/src/routes/battle/-presentation/timeline";
import { loadModelGeometry } from "../../scripts/enemy-model-geometry";
import { cryptOfForgottenEchoes } from "../../apps/game/src/dungeons/crypt-of-forgotten-echoes";
import { trialOfTheAshen } from "../../apps/game/src/dungeons/trial-of-the-ashen";
import { trialOfTheNature } from "../../apps/game/src/dungeons/trial-of-the-nature";
import { trialOfTheStorm } from "../../apps/game/src/dungeons/trial-of-the-storm";
import { trialOfTheTides } from "../../apps/game/src/dungeons/trial-of-the-tides";
import type { Entity } from "../../apps/game/src/entity-types";
import type { TimelineEventFull } from "../../apps/game/src/timeline-events";
import type { EffectTracking } from "../../apps/game/src/bm";

const families = [
  ["crypt", cryptOfForgottenEchoes],
  ["ashen", trialOfTheAshen],
  ["forest", trialOfTheNature],
  ["storm", trialOfTheStorm],
  ["tides", trialOfTheTides],
] as const;
test("every authored trial wave selects its corresponding arena, including ashen Crypt Crawlers", () => {
  for (const [id, create] of families)
    for (const wave of create().availableEnemies)
      expect(
        encounterFor(wave.map((type) => ({ team: "TEAM_B", type }))).id,
      ).toBe(id);
  expect(
    encounterFor([
      { team: "TEAM_B", type: "goblin" },
      { team: "TEAM_B", type: "ashen-skeleton" },
    ]).id,
  ).toBe("court");
  expect(
    encounterFor([
      { team: "TEAM_B", type: "water-elemental" },
      { team: "TEAM_B", type: "thundermaw" },
    ]).id,
  ).toBe("court");
});

type Recording = {
  winner: string;
  participants: Entity[];
  events: TimelineEventFull[];
  effects: EffectTracking;
  final: { id: string; health: number; mana: number; dead: boolean }[];
};
const showcaseIds = ["crypt", "ashen", "storm", "tides"] as const;
const recordings = new Map(
  showcaseIds.map((id) => [
    id,
    SuperJSON.parse<Recording>(
      readFileSync(
        new URL(`./recordings/${id}-showcase.json`, import.meta.url),
        "utf8",
      ),
    ),
  ]),
);
for (const [id, recording] of recordings) {
  test(`${id}: replay finishes at the real battle's recorded health, mana, and deaths`, () => {
    const frames = buildTimeline(
      recording.participants,
      recording.events,
      undefined,
      recording.effects,
    );
    const final = frames.at(-1)!;
    expect(encounterFor(recording.participants).id).toBe(id);
    for (const entity of recording.final)
      expect({
        id: entity.id,
        health: final.stats.get(entity.id)!.health,
        mana: final.stats.get(entity.id)!.mana,
        dead: final.stats.get(entity.id)!.flags.dead,
      }).toEqual(entity);
    expect(["TEAM_A", "TEAM_B"]).toContain(recording.winner);
    const defeated = recording.participants.filter(
      (entity) => entity.team !== recording.winner,
    );
    expect(
      defeated.every((entity) => final.stats.get(entity.id)!.flags.dead),
    ).toBe(true);
  });
}

test("elemental effects are driven by real casts, and lifesteal healing uses a restoration treatment", () => {
  const seen = new Set();
  let restorations = 0;
  for (const recording of recordings.values()) {
    const frames = buildTimeline(
      recording.participants,
      recording.events,
      undefined,
      recording.effects,
    );
    for (const frame of frames) {
      const cue = frame.cue;
      if (!cue) continue;
      const effect = elementalEffectFor(cue);
      if (!effect) continue;
      seen.add(effect);
      expect(cue.kind).toBe("SPELL_CAST");
      for (const target of cue.targetIds) {
        expect(
          recording.participants.some((entity) => entity.id === target),
        ).toBe(true);
        const event = frame.event!.event;
        if (
          event.eventType === "SPELL_CAST" &&
          event.data.healingApplied?.has(target) &&
          !event.data.damageApplied?.has(target)
        ) {
          expect(elementalEffectFor(cue, target, event)).toBe("restore");
          if (cue.skillType === "soulflare" || cue.skillType === "vital-strike")
            restorations++;
        }
      }
      expect(
        elementalEffectFor({ ...cue, kind: "EFFECT_TRIGGER" }),
      ).toBeUndefined();
    }
  }
  expect([...seen].sort()).toEqual([
    "brand",
    "chains",
    "drain",
    "fire",
    "lightning",
    "restore",
    "soul",
    "storm",
    "tide-spear",
    "torrent",
    "water",
  ]);
  expect(restorations).toBeGreaterThan(0);
});

const meshes = (root: Object3D) => {
  const list: Mesh[] = [];
  root.traverse((node) => {
    if (node instanceof Mesh) list.push(node);
  });
  return list;
};
for (const type of [
  "ashen-skeleton",
  "thundermaw",
  "fishfolk-shaman",
  "commander-kelvaris",
  "emberbound-revenant",
]) {
  test(`${type}: cloned textures remain shared, materials stay isolated, and adornments attach to the loaded rig`, async () => {
    const definition = miniatureFor({ team: "TEAM_B", type });
    const asset = await loadModelGeometry(
      readFileSync(
        new URL(`../../apps/client/public${definition.url}`, import.meta.url),
      ),
    );
    const texture = new Texture();
    let textureDisposals = 0;
    texture.addEventListener("dispose", () => textureDisposals++);
    const original = meshes(asset.scene);
    for (const mesh of original)
      if (mesh.material instanceof MeshStandardMaterial)
        mesh.material.map = texture;
    const root = clone(asset.scene);
    const sibling = clone(asset.scene);
    const originals = meshes(root).map((mesh) => mesh.material);
    const count = meshes(root).length;
    const mixer = new AnimationMixer(root);
    root.scale.setScalar(definition.scale);
    root.updateMatrixWorld(true);
    for (let cycle = 0; cycle < 3; cycle++) {
      mixer.stopAllAction();
      mixer
        .clipAction(
          asset.animations.find((clip) => clip.name === definition.clips.idle)!,
        )
        .reset()
        .play();
      mixer.update(0);
      root.updateMatrixWorld(true);
      const cleanup = dressMiniature(
        root,
        appearanceFor({ id: type, team: "TEAM_B", type }, []),
      );
      expect(meshes(root)[0].material).not.toBe(originals[0]);
      expect(meshes(sibling).map((mesh) => mesh.material)).toEqual(originals);
      expect((meshes(root)[0].material as MeshStandardMaterial).map).toBe(
        texture,
      );
      const additions = meshes(root).slice(count);
      if (type !== "ashen-skeleton") {
        expect(additions.length).toBeGreaterThan(0);
        expect(
          additions.every((mesh) => mesh.parent?.parent?.type === "Bone"),
        ).toBe(true);
        root.updateMatrixWorld(true);
        const before = additions.map((mesh) => mesh.matrixWorld.toArray());
        mixer.stopAllAction();
        mixer
          .clipAction(
            asset.animations.find(
              (clip) => clip.name === definition.clips.attack,
            )!,
          )
          .reset()
          .play();
        mixer.update(0.35);
        root.updateMatrixWorld(true);
        expect(additions.map((mesh) => mesh.matrixWorld.toArray())).not.toEqual(
          before,
        );
      }
      let ownDisposals = 0;
      const owned = new Set(
        meshes(root).flatMap((mesh) =>
          Array.isArray(mesh.material) ? mesh.material : [mesh.material],
        ),
      );
      owned.forEach((material) =>
        material.addEventListener("dispose", () => ownDisposals++),
      );
      cleanup();
      expect(ownDisposals).toBe(owned.size);
      expect(textureDisposals).toBe(0);
      expect(meshes(root).map((mesh) => mesh.material)).toEqual(originals);
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
    texture.dispose();
  });
}
