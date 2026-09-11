import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune, resample, weld } from "@gltf-transform/functions";
import sharp from "sharp";

const directory = process.argv[2];
if (!directory)
  throw new Error("Usage: bun scripts/convert-enemy-fbx.ts <source-directory>");
// Export geometry/rigs first, then embed PNG textures without a DOM canvas.
class BlobReader {
  result: ArrayBuffer | null = null;
  onloadend?: () => void;
  async readAsArrayBuffer(blob: Blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
}
Object.assign(globalThis, { FileReader: BlobReader });
const manager = new THREE.LoadingManager();
manager.addHandler(/.*/, {
  load: () => new THREE.Texture(),
  setPath() {
    return this;
  },
} as unknown as THREE.Loader);
const sources = [
  {
    file: "Zombie.fbx",
    texture: "ZombieTexture.png",
    output: "Zombie.glb",
    url: "https://quaternius.com/packs/animatedzombie.html",
    sha256: "203d76f29b12c58529ab6bdf8d3b414b869e9858b2c25f9f9ea5f161ae90349e",
  },
  {
    file: "Treant Package/Treant 1/Tree01_FBX.fbx",
    texture: "Treant Package/Treant 1/Treant_1 Textures/Tree01 Albedo Dark.png",
    output: "Tree01.glb",
    url: "https://tennessippistudios.itch.io/treant-pack",
    sha256: "bd90b4f8dd823334cbb226229ef731c1280ae601ab942d16193b96f5f674a02e",
  },
  {
    file: "Treant Package/Treant 2/Tree02_FBX.fbx",
    texture:
      "Treant Package/Treant 2/Treant_2 Textures/Set 2/Tree02 Albedo Light.png",
    output: "Tree02.glb",
    url: "https://tennessippistudios.itch.io/treant-pack",
    sha256: "f7f5b4b015ee4df4088b438df80abdc923f1b9a5e430a12d5f069bc87e952293",
  },
];
const output = resolve(
  import.meta.dir,
  "../apps/client/public/models/enemies-v1",
);
await mkdir(output, { recursive: true });
const io = new NodeIO();
const report = [];
for (const source of sources) {
  const input = await readFile(resolve(directory, source.file));
  const sha256 = createHash("sha256").update(input).digest("hex");
  if (source.sha256 && sha256 !== source.sha256)
    throw new Error(`Source changed: ${source.file}`);
  const model = new FBXLoader(manager).parse(
    Uint8Array.from(input).buffer,
    directory + "/",
  );
  model.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      const previous = Array.isArray(node.material)
        ? node.material
        : [node.material];
      const materials = previous.map(
        () =>
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
      );
      node.material = materials.length === 1 ? materials[0]! : materials;
    }
  });
  const animations = model.animations.filter((clip) =>
    /Idle|Bite|Attack|Death|Taunt|Walk/.test(clip.name),
  );
  animations.forEach(
    (clip) => (clip.name = clip.name.split("|").pop() ?? clip.name),
  );
  const bytes = await new GLTFExporter().parseAsync(model, {
    binary: true,
    animations,
  });
  const document = await io.readBinary(new Uint8Array(bytes as ArrayBuffer));
  // FBX textures use flipY=true. Preserve that orientation by flipping V,
  // so PNGs retain their original orientation in glTF.
  const uvAccessors = new Set(
    document
      .getRoot()
      .listMeshes()
      .flatMap((mesh) =>
        mesh
          .listPrimitives()
          .map((primitive) => primitive.getAttribute("TEXCOORD_0")),
      ),
  );
  for (const accessor of uvAccessors) {
    const array = accessor?.getArray();
    if (array)
      for (let index = 1; index < array.length; index += 2)
        array[index] = 1 - array[index]!;
  }
  const textureBytes = await readFile(resolve(directory, source.texture));
  const optimizedTexture = source.output.startsWith("Tree")
    ? await sharp(textureBytes)
        .resize({
          width: 512,
          height: 512,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9 })
        .toBuffer()
    : textureBytes;
  const texture = document
    .createTexture("Albedo")
    .setImage(optimizedTexture)
    .setMimeType("image/png");
  document
    .getRoot()
    .listMaterials()
    .forEach((material) =>
      material.setBaseColorTexture(texture).setBaseColorFactor([1, 1, 1, 1]),
    );
  await document.transform(
    resample({ tolerance: 0.0001 }),
    weld(),
    dedup(),
    prune(),
  );
  const result = await io.writeBinary(document);
  await writeFile(resolve(output, source.output), result);
  report.push({
    ...source,
    sha256,
    textureSha256: createHash("sha256").update(textureBytes).digest("hex"),
    textureOutputSha256: createHash("sha256")
      .update(optimizedTexture)
      .digest("hex"),
    textureOutputBytes: optimizedTexture.length,
    textureMaxDimension: source.output.startsWith("Tree") ? 512 : null,
    sourceBytes: input.length,
    bytes: result.length,
    outputSha256: createHash("sha256").update(result).digest("hex"),
    clips: animations.map((clip) => clip.name),
    meshes: document.getRoot().listMeshes().length,
    skins: document.getRoot().listSkins().length,
  });
}
await writeFile(
  resolve(output, "fbx-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  report
    .map(
      (item) => `${item.output}: ${item.bytes} bytes, ${item.clips.join(", ")}`,
    )
    .join("\n"),
);
