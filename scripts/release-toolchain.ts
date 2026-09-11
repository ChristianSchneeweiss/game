import { spawnSync } from "node:child_process";

export function checkToolchain() {
  const node = spawnSync("node", ["--version"], { encoding: "utf8" });
  if (node.status !== 0 || node.stdout.trim() !== "v22.19.0") {
    throw new Error("Release checks require Node 22.19.0 on PATH; run nvm use first.");
  }
  if (Bun.version !== "1.4.0") {
    throw new Error(`Release checks require Bun 1.4.0; found ${Bun.version}.`);
  }
  console.log("Toolchain verified: Node 22.19.0 / Bun 1.4.0");
}

if (import.meta.main) checkToolchain();
