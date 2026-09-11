import { afterEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectProductionArtifact } from "./release-artifact";

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "loot-artifact-test-"));
  temporaryDirectories.push(directory);
  const artifact = join(directory, "dist");
  const publicAssets = join(directory, "public");
  mkdirSync(join(artifact, "assets"), { recursive: true });
  mkdirSync(publicAssets);
  writeFileSync(join(publicAssets, "asset.txt"), "synthetic public asset");
  cpSync(publicAssets, artifact, { recursive: true });
  writeFileSync(
    join(artifact, "index.html"),
    '<script type="module" src="/assets/index.js"></script>',
  );
  writeFileSync(join(artifact, "assets/index.js"), 'console.log("app");');
  return { artifact, publicAssets };
}

test("artifact gate requires an existing built entry and matching public bytes", () => {
  const f = fixture();
  const valid = inspectProductionArtifact(f.artifact, f.publicAssets);
  expect(valid.passed).toBe(true);
  expect(valid.files).toBe(3);
  expect(valid.publicAssets.files).toBe(1);
  writeFileSync(join(f.artifact, "asset.txt"), "changed");
  expect(
    inspectProductionArtifact(f.artifact, f.publicAssets).failures,
  ).toContain("Public asset bytes changed in artifact: asset.txt");
  rmSync(join(f.artifact, "assets/index.js"));
  expect(
    inspectProductionArtifact(f.artifact, f.publicAssets).failures,
  ).toContain("index.html does not load emitted JavaScript");
  rmSync(f.artifact, { recursive: true });
  expect(inspectProductionArtifact(f.artifact, f.publicAssets).passed).toBe(
    false,
  );
});

test("artifact gate rejects private bytes and development payloads with no content disclosure", () => {
  const f = fixture();
  writeFileSync(
    join(f.artifact, "asset.glb"),
    Buffer.concat([
      Buffer.from([0, 255, 128]),
      Buffer.from("release-private-clerk-sentinel"),
    ]),
  );
  writeFileSync(join(f.artifact, "assets/debug.js.map"), "{}");
  writeFileSync(join(f.artifact, "assets/index.js"), '"DATABASE_URL"');
  const result = inspectProductionArtifact(f.artifact, f.publicAssets);
  expect(result.passed).toBe(false);
  expect(result.failures).toEqual(
    expect.arrayContaining([
      "Private build sentinel 1 found: asset.glb",
      "Forbidden artifact path: assets/debug.js.map",
      "server-variable-name found: assets/index.js",
    ]),
  );
  expect(JSON.stringify(result)).not.toContain(
    "release-private-clerk-sentinel",
  );
});
