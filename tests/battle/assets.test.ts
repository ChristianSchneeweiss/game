import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  AnimationMixer,
  LoopOnce,
  SkinnedMesh,
  Material,
  Mesh,
  type Object3D,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import {
  miniatures,
  miniatureFor,
} from "../../apps/client/src/routes/battle/-presentation/visual-manifest";
import { enemyMiniatures } from "../../apps/client/src/routes/battle/-presentation/enemy-miniatures";
import placements from "../../apps/client/src/routes/battle/-presentation/enemy-model-placements.json";
import { EnemyTypeSchema } from "../../apps/game/src/enemies/base/enemy-types";
import {
  loadModelGeometry,
  posedBounds,
} from "../../scripts/enemy-model-geometry";
import { createHash } from "node:crypto";
// Khronos' validator has no TypeScript declarations.
// @ts-expect-error Untyped validator package.
import { validateBytes } from "gltf-validator";

test("every game enemy has a model; party and unknown recordings retain their fallbacks", () => {
  expect(Object.keys(enemyMiniatures).sort()).toEqual(
    EnemyTypeSchema.options.map((type) => type.value).sort(),
  );
  for (const [type, definition] of Object.entries(enemyMiniatures)) {
    expect(miniatureFor({ team: "TEAM_B", type })).toBe(definition);
    expect(miniatureFor({ team: "TEAM_A", type })).toBe(miniatures.party);
  }
  for (const type of [undefined, null, "future-enemy", "__proto__", {}, 7])
    expect(miniatureFor({ team: "TEAM_B", type })).toBe(miniatures.enemy);
});

const definitions = [
  ...new Map(
    [...Object.values(miniatures), ...Object.values(enemyMiniatures)].map(
      (definition) => [definition.url, definition],
    ),
  ).values(),
];
for (const miniature of definitions) {
  const bytes = readFileSync(
    new URL(`../../apps/client/public${miniature.url}`, import.meta.url),
  );
  test(`${miniature.id}: optimized GLB is valid, bounded in size and has all required clips`, async () => {
    const report = await validateBytes(new Uint8Array(bytes));
    expect(report.issues.numErrors).toBe(0);
    expect(bytes.byteLength).toBeLessThan(1_100_000);
    const json = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    for (const name of Object.values(miniature.clips)) {
      if (name === null) continue;
      const clip = json.animations.find(
        (clip: { name: string }) => clip.name === name,
      );
      expect(clip).toBeDefined();
      expect(
        Math.max(
          ...clip.samplers.map(
            (s: { input: number }) => json.accessors[s.input].max[0],
          ),
        ),
      ).toBeGreaterThan(0);
    }
  });

  test(`${miniature.id}: four independent animated instances and repeatable one-shot poses`, async () => {
    // Keep the asset's actual bones, geometry and clips; omit texture decoding for
    // this CPU-only ownership check. Browser acceptance checks the original GLB.
    const gltf = await loadModelGeometry(bytes);
    const copies = Array.from({ length: 4 }, () => clone(gltf.scene));
    const skeletons = copies.map((root) => {
      const result: SkinnedMesh[] = [];
      root.traverse((node) => {
        if (node instanceof SkinnedMesh) result.push(node);
      });
      return result.map((mesh) => mesh.skeleton);
    });
    if (skeletons[0].length) {
      expect(new Set(skeletons.map((list) => list[0])).size).toBe(4);
      expect(new Set(skeletons.map((list) => list[0].bones[0])).size).toBe(4);
    }
    const pose = (root: Object3D) => {
      const result: number[][] = [];
      root.traverse((node) =>
        result.push([...node.position, ...node.quaternion, ...node.scale]),
      );
      return result;
    };
    const siblingPose = () => copies.slice(1).map(pose);
    const before = siblingPose();
    const ownBefore = pose(copies[0]);
    const mixer = new AnimationMixer(copies[0]);
    const clip = gltf.animations.find(
      (a) => a.name === miniature.clips.attack,
    )!;
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset().play();
    mixer.update(0.5);
    const firstPose = pose(copies[0]);
    expect(firstPose).not.toEqual(ownBefore);
    expect(siblingPose()).toEqual(before);
    mixer.update(2);
    action.reset().play();
    mixer.update(0.5);
    expect(pose(copies[0])).toEqual(firstPose);
    expect(siblingPose()).toEqual(before);
    mixer.stopAllAction();
    mixer.uncacheRoot(copies[0]);
    skeletons.flat().forEach((s) => s.dispose());
    const materials = new Set<Material>();
    gltf.scene.traverse((node) => {
      if (node instanceof Mesh) {
        node.geometry.dispose();
        (Array.isArray(node.material)
          ? node.material
          : [node.material]
        ).forEach((m) => materials.add(m));
      }
    });
    materials.forEach((m) => m.dispose());
  });
}

test("placement measurements match the shipped GLBs and contain actual idle poses", async () => {
  for (const [file, placement] of Object.entries(placements)) {
    const bytes = readFileSync(
      new URL(
        "../../apps/client/public/models/enemies-v1/" + file,
        import.meta.url,
      ),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      placement.sha256,
    );
    const asset = await loadModelGeometry(bytes);
    const mixer = new AnimationMixer(asset.scene);
    const idle = asset.animations.find((clip) => /idle/i.test(clip.name))!;
    const action = mixer.clipAction(idle).play();
    for (const phase of [0, 0.25, 0.5, 0.75]) {
      action.time = idle.duration * phase;
      mixer.update(0);
      const bounds = posedBounds(asset.scene);
      for (let axis = 0; axis < 3; axis++) {
        expect(bounds.min.getComponent(axis)).toBeGreaterThanOrEqual(
          placement.min[axis] - 0.00001,
        );
        expect(bounds.max.getComponent(axis)).toBeLessThanOrEqual(
          placement.max[axis] + 0.00001,
        );
      }
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(asset.scene);
  }
  for (const definition of Object.values(enemyMiniatures)) {
    expect(Number.isFinite(definition.scale)).toBe(true);
    expect(definition.scale).toBeGreaterThan(0);
  }
});
