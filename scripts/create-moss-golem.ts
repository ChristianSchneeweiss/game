import * as THREE from "three";
import { writeOriginalModel } from "./original-model-export";

// Original low-poly stone body; limbs are rigid pieces joined by animated pivots.
const root = new THREE.Group();
root.name = "Moss_Golem";
const body = new THREE.Group();
body.name = "Stone_Body";
root.add(body);
const stone = new THREE.MeshStandardMaterial({
  color: 0x747e72,
  roughness: 1,
  flatShading: true,
});
const darkStone = new THREE.MeshStandardMaterial({
  color: 0x454f49,
  roughness: 1,
  flatShading: true,
});
const moss = new THREE.MeshStandardMaterial({
  color: 0x587632,
  roughness: 1,
  flatShading: true,
});
const mossLight = new THREE.MeshStandardMaterial({
  color: 0x849846,
  roughness: 1,
  flatShading: true,
});
const crevice = new THREE.MeshStandardMaterial({
  color: 0x202e26,
  roughness: 1,
});
const glow = new THREE.MeshStandardMaterial({
  color: 0xdef3a0,
  emissive: 0x8ca653,
  emissiveIntensity: 0.7,
  roughness: 0.5,
});
function rock(
  parent: THREE.Object3D,
  name: string,
  size: number,
  position: [number, number, number],
  scale: [number, number, number],
  material: THREE.Material = stone,
) {
  const geometry = new THREE.DodecahedronGeometry(size, 0);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}
rock(body, "Chest", 0.69, [0, 1.18, 0], [1.05, 0.95, 0.67]);
rock(body, "Waist", 0.42, [0, 0.73, 0], [1, 0.7, 0.7], darkStone);
rock(body, "Head", 0.38, [0, 1.93, 0.01], [1, 1, 0.85]);
for (const side of [-1, 1]) {
  rock(
    body,
    `Leg_${side}`,
    0.3,
    [side * 0.29, 0.42, 0],
    [0.8, 1.2, 0.8],
    darkStone,
  );
  rock(body, `Foot_${side}`, 0.3, [side * 0.32, 0.18, 0.12], [1.1, 0.64, 1.3]);
  const arm = new THREE.Group();
  arm.name = side < 0 ? "Arm_Left" : "Arm_Right";
  arm.position.set(side * 0.68, 1.39, 0);
  body.add(arm);
  rock(arm, `${arm.name}_shoulder`, 0.36, [0, 0, 0], [1, 1, 1]);
  rock(
    arm,
    `${arm.name}_upper`,
    0.27,
    [side * 0.08, -0.29, 0],
    [0.86, 1.2, 0.9],
    darkStone,
  );
  rock(
    arm,
    `${arm.name}_fist`,
    0.35,
    [side * 0.15, -0.63, 0.04],
    [1.06, 1.18, 1],
  );
  for (let i = 0; i < 4; i++)
    rock(
      arm,
      `${arm.name}_moss_${i}`,
      0.15,
      [side * (-0.16 + i * 0.09), 0.22 + (i % 2) * 0.06, (i % 2) * 0.16 - 0.09],
      [1, 0.48, 1],
      i % 2 ? moss : mossLight,
    );
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.035), glow);
  eye.name = `Eye_${side}`;
  eye.position.set(side * 0.145, 1.97, 0.306);
  body.add(eye);
}
for (let i = 0; i < 5; i++)
  rock(
    body,
    `Crown_moss_${i}`,
    0.14,
    [(i - 2) * 0.09, 2.22 + (i % 2) * 0.04, (i % 2) * 0.13 - 0.04],
    [1, 0.55, 1],
    i % 2 ? moss : mossLight,
  );
const face = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.04), crevice);
face.name = "Brow_shadow";
face.position.set(0, 1.97, 0.279);
body.add(face);
const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glow);
rune.name = "Forest_rune";
rune.position.set(0, 1.23, 0.455);
rune.scale.set(0.8, 1.4, 0.45);
body.add(rune);
function rotations(
  name: string,
  values: [number, number, number][],
  times: number[],
) {
  return new THREE.QuaternionKeyframeTrack(
    `${name}.quaternion`,
    times,
    values.flatMap((angles) =>
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles)).toArray(),
    ),
  );
}
const times = [0, 0.4, 0.7, 1.3];
const animations = [
  new THREE.AnimationClip("Idle", 3, [
    rotations(
      "Stone_Body",
      [
        [0, 0, 0],
        [0, 0.035, 0],
        [0, 0, 0],
      ],
      [0, 1.5, 3],
    ),
    rotations(
      "Arm_Left",
      [
        [0, 0, 0],
        [0.04, 0, 0.03],
        [0, 0, 0],
      ],
      [0, 1.5, 3],
    ),
  ]),
  new THREE.AnimationClip("Attack", 1.3, [
    rotations(
      "Arm_Right",
      [
        [0, 0, 0],
        [-2.25, 0, -0.15],
        [-0.4, 0, 0.05],
        [0, 0, 0],
      ],
      times,
    ),
    rotations(
      "Stone_Body",
      [
        [0, 0, 0],
        [-0.12, -0.1, 0],
        [0.17, 0.12, 0],
        [0, 0, 0],
      ],
      times,
    ),
  ]),
  new THREE.AnimationClip("Cast", 1.3, [
    rotations(
      "Arm_Left",
      [
        [0, 0, 0],
        [-1.2, 0, 0.6],
        [-1.2, 0, 0.6],
        [0, 0, 0],
      ],
      times,
    ),
    rotations(
      "Arm_Right",
      [
        [0, 0, 0],
        [-1.2, 0, -0.6],
        [-1.2, 0, -0.6],
        [0, 0, 0],
      ],
      times,
    ),
  ]),
  new THREE.AnimationClip("Hit", 0.6, [
    rotations(
      "Stone_Body",
      [
        [0, 0, 0],
        [-0.14, 0, 0.06],
        [0, 0, 0],
      ],
      [0, 0.15, 0.6],
    ),
  ]),
  new THREE.AnimationClip("Death", 1.5, [
    rotations(
      "Stone_Body",
      [
        [0, 0, 0],
        [-0.2, 0, 0.07],
        [-Math.PI / 2, 0, 0],
      ],
      [0, 0.45, 1.5],
    ),
    new THREE.VectorKeyframeTrack(
      "Stone_Body.position",
      [0, 0.45, 1.5],
      [0, 0, 0, 0, 0, 0, 0, 0.4, 0],
    ),
  ]),
];
await writeOriginalModel("Moss_Golem.glb", root, animations);
