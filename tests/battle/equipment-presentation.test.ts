import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  AnimationMixer,
  Mesh,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { loadModelGeometry } from "../../scripts/enemy-model-geometry";
import {
  appearanceFor,
  dressMiniature,
} from "../../apps/client/src/routes/battle/-presentation/miniature-appearance";
import { heroAppearanceFor } from "../../apps/client/src/routes/battle/-presentation/hero-equipment";

const load = () =>
  loadModelGeometry(
    readFileSync(
      new URL(
        "../../apps/client/public/models/battle-v2/knight.glb",
        import.meta.url,
      ),
    ),
  );
const meshes = (root: Object3D) => {
  const result: Mesh[] = [];
  root.traverse((node) => {
    if (node instanceof Mesh) result.push(node);
  });
  return result;
};

test("equipment appearance uses the entity snapshot, remains stable between renders, and handles empty or old builds", () => {
  const party = [
    {
      id: "a",
      team: "TEAM_A",
      equipped: {
        WEAPON: { itemType: "oakwarden-staff" },
        ARMOR: { itemType: "int-armor" },
      },
    },
    { id: "b", team: "TEAM_A" },
  ];
  const appearance = appearanceFor(party[0]!, party);
  expect(appearance).toEqual({
    kind: "hero",
    accent: "amber",
    weapon: "oakwarden-staff",
    armor: "int-armor",
  });
  expect(appearanceFor(party[0]!, [...party].reverse())).toBe(appearance);
  expect(appearanceFor(party[1]!, party)).toMatchObject({
    accent: "teal",
    weapon: null,
    armor: null,
  });
  expect(
    heroAppearanceFor(
      { equipped: { WEAPON: { itemType: "unknown" } } },
      "amber",
    ).weapon,
  ).toBeNull();
});

test("real knight gear dressing changes only the owned clone and releases every added resource", async () => {
  const asset = await load();
  const root = clone(asset.scene);
  const sibling = clone(asset.scene);
  const originals = meshes(root).map((mesh) => ({
    mesh,
    material: mesh.material,
    visible: mesh.visible,
  }));
  let sharedDisposals = 0;
  for (const mesh of meshes(asset.scene)) {
    mesh.geometry.addEventListener("dispose", () => sharedDisposals++);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material])
      material.addEventListener("dispose", () => sharedDisposals++);
  }
  for (let cycle = 0; cycle < 3; cycle++) {
    const undress = dressMiniature(
      root,
      heroAppearanceFor(
        {
          equipped: {
            WEAPON: { itemType: "oakwarden-staff" },
            ARMOR: { itemType: "int-armor" },
          },
        },
        "teal",
      ),
    );
    expect(root.getObjectByName("1H_Sword")!.visible).toBe(false);
    expect(root.getObjectByName("Badge_Shield")!.visible).toBe(false);
    expect(root.getObjectByName("Knight_Helmet")!.visible).toBe(false);
    const staff = root.getObjectByName("Equipped_Oakwarden_Staff")!;
    expect(staff.parent!.name).toBe("handslotr");
    expect(root.getObjectByName("Equipped_Arcanist_Robes")!.parent!.name).toBe(
      "hips",
    );
    const materials = new Set<Material>();
    const geometries = new Set(meshes(staff).map((mesh) => mesh.geometry));
    for (const mesh of meshes(root))
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        if (
          !originals.some((original) =>
            (Array.isArray(original.material)
              ? original.material
              : [original.material]
            ).includes(material),
          )
        )
          materials.add(material);
      }
    let disposedMaterials = 0;
    let disposedGeometry = 0;
    materials.forEach((material) =>
      material.addEventListener("dispose", () => disposedMaterials++),
    );
    geometries.forEach((geometry) =>
      geometry.addEventListener("dispose", () => disposedGeometry++),
    );
    undress();
    expect(disposedMaterials).toBe(materials.size);
    expect(disposedGeometry).toBe(geometries.size);
    expect(root.getObjectByName("Equipped_Oakwarden_Staff")).toBeUndefined();
    for (const original of originals) {
      expect(original.mesh.material).toBe(original.material);
      expect(original.mesh.visible).toBe(original.visible);
    }
  }
  expect(sharedDisposals).toBe(0);
  expect(meshes(sibling).map((mesh) => mesh.material)).toEqual(
    originals.map((entry) => entry.material),
  );
});

test("weapons remain attached during real attack, cast and death animations; armor and empty gear have distinct visibility", async () => {
  const asset = await load();
  const root = clone(asset.scene);
  const undo = dressMiniature(
    root,
    heroAppearanceFor(
      {
        equipped: {
          WEAPON: { itemType: "oakwarden-staff" },
          ARMOR: { itemType: "iron-cuirass" },
        },
      },
      "amber",
    ),
  );
  const staff = root.getObjectByName("Equipped_Oakwarden_Staff")!;
  const socket = root.getObjectByName("handslotr")!;
  const mixer = new AnimationMixer(root);
  const idle = asset.animations.find((clip) => clip.name === "Idle")!;
  mixer.clipAction(idle).play();
  for (const time of [0, 0.3, 0.7]) {
    mixer.setTime(time);
    root.updateMatrixWorld(true);
    const grip = staff.getWorldPosition(new Vector3());
    const tip = staff.localToWorld(new Vector3(0, 1.57, 0));
    const foot = staff.localToWorld(new Vector3(0, -0.6, 0));
    expect(tip.y - grip.y).toBeGreaterThan(1.4);
    expect(foot.y).toBeGreaterThan(-0.05);
  }
  for (const name of [
    "1H_Melee_Attack_Slice_Diagonal",
    "Spellcast_Shoot",
    "Death_A",
  ]) {
    mixer.stopAllAction();
    const clip = asset.animations.find((clip) => clip.name === name)!;
    mixer.clipAction(clip).play();
    mixer.update(clip.duration * 0.45);
    root.updateMatrixWorld(true);
    const expected = socket.localToWorld(staff.position.clone());
    expect(
      staff.getWorldPosition(new Vector3()).distanceTo(expected),
    ).toBeLessThan(0.00001);
    expect(root.getObjectByName("Knight_Helmet")!.visible).toBe(true);
  }
  undo();
  const undoSword = dressMiniature(
    root,
    heroAppearanceFor(
      { equipped: { WEAPON: { itemType: "iron-sword" } } },
      "amber",
    ),
  );
  expect(root.getObjectByName("1H_Sword")!.visible).toBe(true);
  expect(root.getObjectByName("Knight_Helmet")!.visible).toBe(false);
  undoSword();
  const undoEmpty = dressMiniature(root, heroAppearanceFor({}, "amber"));
  expect(root.getObjectByName("1H_Sword")!.visible).toBe(false);
  undoEmpty();
  mixer.stopAllAction();
  mixer.uncacheRoot(root);
});
