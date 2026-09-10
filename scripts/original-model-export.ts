import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

// The browser exporter needs FileReader even when no image canvas is involved.
class BlobReader {
  result: ArrayBuffer | null = null;
  onloadend?: () => void;
  async readAsArrayBuffer(blob: Blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
}
export async function exportGlb(
  root: THREE.Object3D,
  animations: THREE.AnimationClip[],
) {
  Object.assign(globalThis, { FileReader: BlobReader });
  const result = await new GLTFExporter().parseAsync(root, {
    binary: true,
    animations,
  });
  return new Uint8Array(result as ArrayBuffer);
}
type OriginalModel = {
  output: string;
  bytes: number;
  sha256: string;
  clips: string[];
};
export async function writeOriginalModel(
  file: string,
  root: THREE.Object3D,
  animations: THREE.AnimationClip[],
) {
  const output = resolve(
    import.meta.dir,
    "../apps/client/public/models/enemies-v1",
  );
  await mkdir(output, { recursive: true });
  const bytes = await exportGlb(root, animations);
  await writeFile(resolve(output, file), bytes);
  const reportPath = resolve(output, "original-report.json");
  let report: OriginalModel[] = [];
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  report = report.filter((item) => item.output !== file);
  report.push({
    output: file,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    clips: animations.map((clip) => clip.name),
  });
  report.sort((a, b) => a.output.localeCompare(b.output));
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(
    `Created ${file}: ${bytes.length} bytes, ${animations.length} animations.`,
  );
}
