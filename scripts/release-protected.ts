import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const historicalCommit = "3835a6098bd0081e5ac942ae78557a1edf4ae51c";
export const repositoryRoot = resolve(import.meta.dir, "..");

export function checkProtectedFiles(root = repositoryRoot) {
  // Derive the protected list from Git, never from the current working tree.
  const files = execFileSync("git", [
    "ls-tree", "-rz", "--name-only", historicalCommit, "--", "tests",
  ], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  if (files.length !== 34) throw new Error(`Expected 34 protected files, found ${files.length}.`);
  const changed = files.filter((file) => {
    const original = execFileSync("git", ["show", `${historicalCommit}:${file}`], {
      cwd: root, maxBuffer: 16 * 1024 * 1024,
    });
    try {
      return !lstatSync(resolve(root, file)).isFile() ||
        !original.equals(readFileSync(resolve(root, file)));
    } catch {
      return true;
    }
  });
  if (changed.length) throw new Error(`Protected files changed or missing:\n${changed.join("\n")}`);
  console.log(`Verified ${files.length} historical files byte-identical to ${historicalCommit}.`);
}

if (import.meta.main) checkProtectedFiles();
