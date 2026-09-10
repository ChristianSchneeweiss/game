import * as THREE from "three";
import { writeOriginalModel } from "./original-model-export";

// Original geometry with transform animation; no textures or external services.
const root = new THREE.Group();
root.name = "Water_Elemental";
const body = new THREE.Group();
body.name = "Current";
root.add(body);
const water = new THREE.MeshStandardMaterial({
  color: 0x3bbccc,
  roughness: 0.22,
  metalness: 0.12,
  flatShading: true,
});
const deep = new THREE.MeshStandardMaterial({
  color: 0x187a9e,
  roughness: 0.3,
  flatShading: true,
});
const foam = new THREE.MeshStandardMaterial({
  color: 0xc0f7ee,
  roughness: 0.4,
  emissive: 0x164a51,
  flatShading: true,
});
const dark = new THREE.MeshStandardMaterial({
  color: 0x07364c,
  roughness: 0.3,
});
const core = new THREE.MeshStandardMaterial({
  color: 0xc4ffee,
  emissive: 0x65eace,
  emissiveIntensity: 0.7,
  roughness: 0.3,
});
function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  x: number,
  y: number,
  z: number,
  scale?: [number, number, number],
) {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.position.set(x, y, z);
  if (scale) result.scale.set(...scale);
  parent.add(result);
  return result;
}
const cone = (top: number, bottom: number, height: number) =>
  new THREE.CylinderGeometry(top, bottom, height, 8);
const profile = [
  [0.13, 0],
  [0.2, 0.13],
  [0.31, 0.3],
  [0.48, 0.55],
  [0.58, 0.78],
  [0.57, 0.97],
  [0.4, 1.05],
].map(([radius, height]) => new THREE.Vector2(radius!, height!));
const currentGeometry = new THREE.LatheGeometry(profile, 10).toNonIndexed();
currentGeometry.computeVertexNormals();
mesh(body, currentGeometry, water, "Rising_current", 0, 0.18, 0);
mesh(
  body,
  new THREE.IcosahedronGeometry(0.48, 1),
  water,
  "Crest_head",
  0,
  1.68,
  0,
  [0.8, 1, 0.82],
);
mesh(
  body,
  new THREE.ConeGeometry(0.22, 0.65, 6),
  water,
  "Swept_crest",
  0.13,
  2.07,
  -0.09,
).rotation.z = -0.28;
mesh(
  body,
  new THREE.IcosahedronGeometry(0.17, 1),
  core,
  "Heart_of_the_tide",
  0,
  1.1,
  0.51,
  [0.8, 1, 0.6],
);
for (const side of [-1, 1]) {
  const arm = new THREE.Group();
  arm.name = side < 0 ? "Arm_Left" : "Arm_Right";
  arm.position.set(side * 0.54, 1.28, 0);
  body.add(arm);
  mesh(
    arm,
    new THREE.IcosahedronGeometry(0.26, 1),
    water,
    `${arm.name}_shoulder`,
    side * 0.03,
    0,
    0,
  );
  mesh(
    arm,
    cone(0.16, 0.24, 0.52),
    water,
    `${arm.name}_forearm`,
    side * 0.13,
    -0.26,
    0.06,
  ).rotation.z = side * 0.3;
  mesh(
    arm,
    new THREE.IcosahedronGeometry(0.25, 1),
    deep,
    `${arm.name}_fist`,
    side * 0.22,
    -0.48,
    0.1,
    [1, 1.2, 1],
  );
  mesh(
    body,
    new THREE.BoxGeometry(0.16, 0.065, 0.065),
    dark,
    `Eye_${side}`,
    side * 0.16,
    1.73,
    0.346,
  ).rotation.z = side * 0.14;
  mesh(
    body,
    new THREE.ConeGeometry(0.1, 0.31, 5),
    foam,
    `Fin_${side}`,
    side * 0.34,
    1.8,
    -0.08,
  ).rotation.z = -side * 0.62;
}
for (let level = 0; level < 3; level++) {
  const swirl = mesh(
    body,
    new THREE.TorusGeometry(0.23 + level * 0.14, 0.046, 4, 14, Math.PI * 1.63),
    foam,
    `Foam_ring_${level}`,
    0,
    0.25 + level * 0.3,
    0,
  );
  swirl.rotation.set(Math.PI / 2, level * 0.12, level * 1.9);
}
for (let index = 0; index < 5; index++) {
  const angle = (index / 5) * Math.PI * 2;
  mesh(
    body,
    new THREE.IcosahedronGeometry(0.065, 0),
    foam,
    `Spray_${index}`,
    Math.cos(angle) * 0.78,
    0.6 + index * 0.2,
    Math.sin(angle) * 0.48,
    [0.65, 1.4, 0.65],
  );
}
function rotations(
  name: string,
  values: [number, number, number][],
  times: number[],
) {
  return new THREE.QuaternionKeyframeTrack(
    `${name}.quaternion`,
    times,
    values.flatMap((euler) =>
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler)).toArray(),
    ),
  );
}
const times = [0, 0.35, 0.7, 1.2];
const animations = [
  new THREE.AnimationClip("Idle", 2.4, [
    new THREE.VectorKeyframeTrack(
      "Current.position",
      [0, 1.2, 2.4],
      [0, 0, 0, 0, 0.08, 0, 0, 0, 0],
    ),
    rotations(
      "Arm_Left",
      [
        [0, 0, 0],
        [0.1, 0, 0.09],
        [0, 0, 0],
      ],
      [0, 1.2, 2.4],
    ),
    rotations(
      "Arm_Right",
      [
        [0, 0, 0],
        [-0.1, 0, -0.09],
        [0, 0, 0],
      ],
      [0, 1.2, 2.4],
    ),
  ]),
  new THREE.AnimationClip("Attack", 1.2, [
    rotations(
      "Arm_Right",
      [
        [0, 0, 0],
        [-1.5, 0, -0.25],
        [-0.8, 0, 0.15],
        [0, 0, 0],
      ],
      times,
    ),
    rotations(
      "Current",
      [
        [0, 0, 0],
        [0.12, -0.25, 0],
        [-0.1, 0.2, 0],
        [0, 0, 0],
      ],
      times,
    ),
  ]),
  new THREE.AnimationClip("Cast", 1.2, [
    rotations(
      "Arm_Right",
      [
        [0, 0, 0],
        [0, 0, -1.7],
        [0, 0, -1.5],
        [0, 0, 0],
      ],
      times,
    ),
    rotations(
      "Arm_Left",
      [
        [0, 0, 0],
        [0, 0, 1.7],
        [0, 0, 1.5],
        [0, 0, 0],
      ],
      times,
    ),
  ]),
  new THREE.AnimationClip("Hit", 0.5, [
    rotations(
      "Current",
      [
        [0, 0, 0],
        [-0.2, 0, 0.14],
        [0, 0, 0],
      ],
      [0, 0.16, 0.5],
    ),
  ]),
  new THREE.AnimationClip("Death", 1.2, [
    new THREE.VectorKeyframeTrack(
      "Current.scale",
      [0, 0.4, 1.2],
      [1, 1, 1, 1.1, 0.65, 1.1, 1.35, 0.045, 1.35],
    ),
    new THREE.VectorKeyframeTrack(
      "Current.position",
      [0, 1.2],
      [0, 0, 0, 0, -0.06, 0],
    ),
  ]),
];
await writeOriginalModel("Water_Elemental.glb", root, animations);
