import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import SuperJSON from "superjson";
import {
  AnimationMixer,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { loadModelGeometry } from "../../scripts/enemy-model-geometry";
import {
  appearanceFor,
  dressMiniature,
} from "../../apps/client/src/routes/battle/-presentation/miniature-appearance";
import { encounterFor } from "../../apps/client/src/routes/battle/-presentation/encounter-presentation";
import { natureEffectFor } from "../../apps/client/src/routes/battle/-presentation/spell-appearance";
import {
  miniatureFor,
  miniatures,
} from "../../apps/client/src/routes/battle/-presentation/visual-manifest";
import { buildTimeline } from "../../apps/client/src/routes/battle/-presentation/timeline";
import type { Entity } from "../../apps/game/src/entity-types";
import type { TimelineEventFull } from "../../apps/game/src/timeline-events";
import type { EffectTracking } from "../../apps/game/src/bm";

const recording = SuperJSON.parse<{
  participants: Entity[];
  events: TimelineEventFull[];
  effects: EffectTracking;
}>(
  readFileSync(
    new URL("./recordings/forest-showcase.json", import.meta.url),
    "utf8",
  ),
);
const frames = buildTimeline(
  recording.participants,
  recording.events,
  undefined,
  recording.effects,
);
const load = async (url: string) =>
  loadModelGeometry(
    readFileSync(new URL(`../../apps/client/public${url}`, import.meta.url)),
  );
const surfaces = (root: Object3D) => {
  const result: Mesh[] = [];
  root.traverse((node) => {
    if (node instanceof Mesh) result.push(node);
  });
  return result;
};

test("the forest treatment follows enemy identities and falls back for mixed or legacy rosters", () => {
  expect(encounterFor(recording.participants)).toMatchObject({
    id: "forest",
    title: "Sanctum of the Oakwarden",
  });
  expect(encounterFor([{ team: "TEAM_B", type: "elder-treant" }]).id).toBe(
    "forest",
  );
  for (const unknown of [
    undefined,
    "unknown",
    "__proto__",
    {},
    "storm-hatchling",
  ]) {
    expect(
      encounterFor([
        { team: "TEAM_B", type: "barkhide-shaman" },
        { team: "TEAM_B", type: unknown },
      ]).id,
    ).toBe("court");
  }
  expect(encounterFor([]).id).toBe("court");
  expect(encounterFor([{ team: "TEAM_A" }]).id).toBe("court");
});

test("party colors remain distinct and stable when the participant array is reordered", () => {
  const party = recording.participants.filter((e) => e.team === "TEAM_A");
  const looks = party.map((e) => appearanceFor(e, recording.participants));
  expect(new Set(looks).size).toBe(party.length);
  expect(
    party.map((e) => appearanceFor(e, [...recording.participants].reverse())),
  ).toEqual(looks);
});

test("dressing one real knight cannot recolor or dispose another instance's shared asset", async () => {
  const asset = await load(miniatures.party.url);
  const first = clone(asset.scene);
  const sibling = clone(asset.scene);
  const sourceMeshes = surfaces(asset.scene);
  let sharedDisposals = 0;
  for (const mesh of sourceMeshes) {
    mesh.geometry.addEventListener("dispose", () => sharedDisposals++);
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
      (m) => m.addEventListener("dispose", () => sharedDisposals++),
    );
  }
  const old = surfaces(first).map((mesh) => mesh.material);
  const undress = dressMiniature(first, "amber");
  const changed = surfaces(first).filter(
    (mesh, index) => mesh.material !== old[index],
  );
  expect(changed.map((mesh) => mesh.name).sort()).toEqual([
    "Badge_Shield",
    "Knight_Cape",
  ]);
  expect(surfaces(sibling).map((mesh) => mesh.material)).toEqual(old);
  expect(sourceMeshes.map((mesh) => mesh.material)).toEqual(old);
  const fabric = changed[0].material as MeshStandardMaterial;
  let ownDisposals = 0;
  fabric.addEventListener("dispose", () => ownDisposals++);
  undress();
  expect(ownDisposals).toBe(1);
  expect(sharedDisposals).toBe(0);
  expect(surfaces(first).map((mesh) => mesh.material)).toEqual(old);
});

for (const type of ["barkhide-shaman", "elder-treant", "hollowed-oakwarden"]) {
  test(`${type}: adornments follow the real rig and clean up without accumulating`, async () => {
    const definition = miniatureFor({ team: "TEAM_B", type });
    const asset = await load(definition.url);
    const root = clone(asset.scene);
    const sourceMeshes = new Set(surfaces(root));
    const mixer = new AnimationMixer(root);
    const idle = asset.animations.find(
      (c) => c.name === definition.clips.idle,
    )!;
    mixer.clipAction(idle).play();
    mixer.update(0);
    root.scale.setScalar(definition.scale);
    root.updateMatrixWorld(true);
    const appearance = appearanceFor({ id: type, team: "TEAM_B", type }, []);
    for (let cycle = 0; cycle < 3; cycle++) {
      const cleanup = dressMiniature(root, appearance);
      const additions = surfaces(root).filter(
        (mesh) => !sourceMeshes.has(mesh),
      );
      expect(additions.length).toBeGreaterThan(0);
      expect(
        additions.every((mesh) => mesh.parent?.parent?.type === "Bone"),
      ).toBe(true);
      root.updateMatrixWorld(true);
      const before = additions.map((mesh) =>
        mesh.matrixWorld.clone().toArray(),
      );
      mixer.update(0.25);
      root.updateMatrixWorld(true);
      expect(additions.map((mesh) => mesh.matrixWorld.toArray())).not.toEqual(
        before,
      );
      let disposed = 0;
      additions.forEach((mesh) =>
        mesh.geometry.addEventListener("dispose", () => disposed++),
      );
      cleanup();
      expect(disposed).toBe(additions.length);
      expect(surfaces(root)).toHaveLength(sourceMeshes.size);
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
  });
}

test("real forest casts exercise every nature treatment using only recorded target identities", () => {
  const seen = new Set<string>();
  const ids = new Set(recording.participants.map((e) => e.id));
  for (const frame of frames) {
    const cue = frame.cue;
    if (!cue) continue;
    const effect = natureEffectFor(cue);
    if (!effect) continue;
    seen.add(effect);
    expect(cue.kind).toBe("SPELL_CAST");
    expect(ids.has(cue.casterId!)).toBe(true);
    expect(cue.targetIds.every((id) => ids.has(id))).toBe(true);
  }
  expect([...seen].sort()).toEqual([
    "bark",
    "leaves",
    "roots",
    "splinters",
    "stone",
    "venom",
    "verdant",
  ]);
  const root = frames.find(
    (frame) => frame.cue?.skillType === "rootgrasp",
  )!.cue!;
  expect(root.targetIds.sort()).toEqual(
    recording.participants
      .filter((e) => e.team === "TEAM_A")
      .map((e) => e.id)
      .sort(),
  );
  expect(natureEffectFor({ ...root, kind: "EFFECT_TRIGGER" })).toBeUndefined();
  expect(natureEffectFor({ ...root, skillType: undefined })).toBeUndefined();
});
