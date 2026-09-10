import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune, resample } from "@gltf-transform/functions";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

// Prepare the review collection without importing it into the battle renderer.
const directory = process.argv[2];
if (!directory)
  throw new Error("Usage: bun scripts/prepare-enemy-models.ts <sources>");
const output = resolve(
  import.meta.dir,
  "../apps/client/public/models/enemies-v1",
);
const sources: { file: string; url: string; sha256: string }[] = JSON.parse(
  await readFile(resolve(directory, "sources.json"), "utf8"),
);
await mkdir(output, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const report = [];
for (const source of sources) {
  const path = resolve(directory, source.file);
  const input = await readFile(path);
  if (createHash("sha256").update(input).digest("hex") !== source.sha256)
    throw new Error(`Unexpected source bytes: ${source.file}`);
  const document = await io.read(path);
  const root = document.getRoot();
  const allClips = root.listAnimations().map((clip) => clip.getName());
  const keep = source.file.startsWith("Skeleton_")
    ? [
        "Idle",
        "1H_Melee_Attack_Slice_Diagonal",
        "Unarmed_Melee_Attack_Punch_A",
        "Spellcast_Shoot",
        "Spellcast_Raise",
        "Hit_A",
        "Death_A",
      ]
    : allClips.filter((name) =>
        /^(Idle|Flying_Idle|Attack|Bite|Headbutt|Punch|Weapon|Hit|HitReact|Death|Walk|Run)$/.test(
          name,
        ),
      );
  for (const animation of root.listAnimations()) {
    if (keep.includes(animation.getName())) continue;
    animation.listChannels().forEach((channel) => channel.dispose());
    animation.listSamplers().forEach((sampler) => sampler.dispose());
    animation.dispose();
  }
  await document.transform(resample({ tolerance: 0.0001 }), dedup(), prune());
  const bytes = await io.writeBinary(document);
  const file = source.file.replace(/\.(gltf|glb)$/, ".glb");
  await writeFile(resolve(output, file), bytes);
  report.push({
    ...source,
    output: file,
    sourceBytes: input.length,
    bytes: bytes.length,
    outputSha256: createHash("sha256").update(bytes).digest("hex"),
    clips: keep,
    meshes: root.listMeshes().length,
    skins: root.listSkins().length,
  });
}
await writeFile(
  resolve(output, "build-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  report
    .map(
      (item) =>
        `${item.output}: ${item.bytes} bytes, ${item.clips.length} clips`,
    )
    .join("\n"),
);
