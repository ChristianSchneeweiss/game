import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { AnimationMixer, LoopOnce, SkinnedMesh, Material, Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { miniature } from "../../apps/client/src/routes/battle/-presentation/visual-manifest";
// Khronos' validator has no TypeScript declarations.
// @ts-expect-error Untyped validator package.
import { validateBytes } from "gltf-validator";

const bytes = readFileSync(
  new URL(
    "../../apps/client/public/models/kaykit-skeletons-1.0/warrior.glb",
    import.meta.url,
  ),
);
test("versioned GLB is valid and has all required nonzero-duration clips", async () => {
  const report = await validateBytes(new Uint8Array(bytes));
  expect(report.issues.numErrors).toBe(0);
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  expect(json.skins.length).toBeGreaterThan(0);
  for (const name of Object.values(miniature.clips)) {
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

test("four independent imported skeletons: one-shot replay never animates a sibling", async () => {
  // Keep the asset's actual bones, geometry and clips; omit texture decoding for
  // this CPU-only ownership check. Browser acceptance checks the original GLB.
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  json.images = [];
  json.textures = [];
  json.materials = [];
  for (const mesh of json.meshes)
    for (const primitive of mesh.primitives) delete primitive.material;
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
  text.copy(padded);
  const binary = bytes.subarray(20 + jsonLength);
  const buffer = Buffer.alloc(20 + padded.length + binary.length);
  buffer.writeUInt32LE(0x46546c67, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(buffer.length, 8);
  buffer.writeUInt32LE(padded.length, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(buffer, 20);
  binary.copy(buffer, 20 + padded.length);
  const gltf = await new GLTFLoader().parseAsync(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
    "",
  );
  const copies = Array.from({ length: 4 }, () => clone(gltf.scene));
  const bones = copies.map((root) => {
    const result: SkinnedMesh[] = [];
    root.traverse((node) => {
      if (node instanceof SkinnedMesh) result.push(node);
    });
    return result[0].skeleton;
  });
  expect(new Set(bones).size).toBe(4);
  expect(new Set(bones.map((s) => s.bones[0])).size).toBe(4);
  const siblingPose = () =>
    bones
      .slice(1)
      .map((s) => s.bones.map((b) => [...b.position, ...b.quaternion]));
  const before = siblingPose();
  const mixer = new AnimationMixer(copies[0]);
  const clip = gltf.animations.find((a) => a.name === miniature.clips.attack)!;
  const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
  action.reset().play();
  mixer.update(0.5);
  const firstPose = bones[0].bones.map((b) => [...b.position, ...b.quaternion]);
  expect(siblingPose()).toEqual(before);
  mixer.update(2);
  action.reset().play();
  mixer.update(0.5);
  expect(bones[0].bones.map((b) => [...b.position, ...b.quaternion])).toEqual(
    firstPose,
  );
  expect(siblingPose()).toEqual(before);
  mixer.stopAllAction();
  mixer.uncacheRoot(copies[0]);
  bones.forEach((s) => s.dispose());
  const materials = new Set<Material>();
  gltf.scene.traverse((node) => {
    if (node instanceof Mesh) {
      node.geometry.dispose();
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(
        (m) => materials.add(m),
      );
    }
  });
  materials.forEach((m) => m.dispose());
});
