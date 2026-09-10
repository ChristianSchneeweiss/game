import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune, resample } from "@gltf-transform/functions";

// Run with a directory containing the original downloads. Hashes deliberately
// fail closed if an upstream file changes; review provenance before updating.
const sourceDirectory = process.argv[2];
if (!sourceDirectory)
  throw new Error(
    "Usage: bun scripts/prepare-battle-models.ts <original-download-directory>",
  );
const outputDirectory = resolve(
  import.meta.dir,
  "../apps/client/public/models/battle-v2",
);
const sources = [
  {
    source: "Knight.glb",
    output: "knight.glb",
    sha256: "60428e3abc09ba83e595d256e3af8c5c976b46cdae599f0802fc82b4a3445168",
    clips: [
      "Idle",
      "1H_Melee_Attack_Slice_Diagonal",
      "Spellcast_Shoot",
      "Spellcast_Raise",
      "Hit_A",
      "Death_A",
    ],
    remove: [
      "1H_Sword_Offhand",
      "Rectangle_Shield",
      "Round_Shield",
      "Spike_Shield",
      "2H_Sword",
    ],
  },
  {
    source: "Dragon.gltf",
    output: "dragon.glb",
    sha256: "d219a29b5e928da26c24218a64284bbf999b88484a508ac6c01e0edad9f1f56c",
    clips: ["Flying_Idle", "Headbutt", "Punch", "HitReact", "Death"],
    remove: [],
  },
];
const io = new NodeIO();
const report = [];
await mkdir(outputDirectory, { recursive: true });
for (const source of sources) {
  const path = resolve(sourceDirectory, source.source);
  const input = await readFile(path);
  if (createHash("sha256").update(input).digest("hex") !== source.sha256)
    throw new Error(`Unexpected original file: ${source.source}`);
  const document = await io.read(path);
  const root = document.getRoot();
  const originalClips = root.listAnimations().length;
  const originalMeshes = root.listMeshes().length;
  for (const name of source.clips)
    if (
      !root.listAnimations().some((animation) => animation.getName() === name)
    )
      throw new Error(`Missing required clip: ${source.source} / ${name}`);
  for (const animation of root.listAnimations()) {
    if (source.clips.includes(animation.getName())) continue;
    animation.listChannels().forEach((channel) => channel.dispose());
    animation.listSamplers().forEach((sampler) => sampler.dispose());
    animation.dispose();
  }
  for (const node of root.listNodes())
    if (source.remove.includes(node.getName())) node.setMesh(null);
  // Resample removes redundant animation keys; geometry and textures retain
  // their original precision. No compression decoder is needed in the browser.
  await document.transform(resample({ tolerance: 0.0001 }), dedup(), prune());
  const bytes = await io.writeBinary(document);
  await writeFile(resolve(outputDirectory, source.output), bytes);
  report.push({
    source: source.source,
    sourceSha256: source.sha256,
    sourceBytes: input.length,
    output: source.output,
    outputSha256: createHash("sha256").update(bytes).digest("hex"),
    outputBytes: bytes.length,
    originalClips,
    retainedClips: source.clips,
    originalMeshes,
    retainedMeshes: root.listMeshes().length,
  });
}
await writeFile(
  resolve(outputDirectory, "build-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
