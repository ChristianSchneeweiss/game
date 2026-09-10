import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, SkinnedMesh, type Object3D } from "three";

/** Retain real geometry, skins and animation; omit browser texture decoding. */
export async function loadModelGeometry(bytes: Buffer) {
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  delete json.images;
  delete json.textures;
  delete json.materials;
  delete json.extensionsUsed;
  delete json.extensionsRequired;
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
  return new GLTFLoader().parseAsync(buffer.buffer, "");
}

export function posedBounds(root: Object3D) {
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (node instanceof SkinnedMesh) node.skeleton.update();
  });
  return new Box3().setFromObject(root, true);
}
