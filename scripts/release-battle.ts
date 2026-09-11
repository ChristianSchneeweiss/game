import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkProtectedFiles, repositoryRoot } from "./release-protected";
import { checkToolchain } from "./release-toolchain";
import { verifyBattleOutput } from "./release-verify";

checkToolchain();
checkProtectedFiles();
const files = [...new Bun.Glob("**/*.test.{ts,tsx}").scanSync(resolve(repositoryRoot, "tests/battle"))].sort();
const artifactDirectory = process.env.RELEASE_ARTIFACT_DIR
  ? resolve(process.env.RELEASE_ARTIFACT_DIR)
  : mkdtempSync(join(tmpdir(), "loot-release-"));
mkdirSync(artifactDirectory, { recursive: true });
const logPath = join(artifactDirectory, "battle.log");
console.log(`Running the original isolated suite. Raw output retained at ${logPath}`);
const logDescriptor = openSync(logPath, "w");
let exitCode: number;
try {
  const child = Bun.spawn([process.execPath, "tests/battle/run.ts"], {
    cwd: repositoryRoot,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    stdout: logDescriptor,
    stderr: logDescriptor,
  });
  exitCode = await child.exited;
} finally {
  closeSync(logDescriptor);
}
const raw = readFileSync(logPath, "utf8");
process.stdout.write(raw);
writeFileSync(join(artifactDirectory, "battle-exit-code.txt"), `${exitCode}\n`);
const result = verifyBattleOutput(raw, exitCode, files);
checkProtectedFiles();
console.log(`Release regression gate: ${result.passed} pass, exactly ${result.acceptedFailures.length} accepted historical failures across ${result.files} files.`);
for (const failure of result.acceptedFailures) console.log(`Historical exception: ${failure}`);
console.log(`Raw runner exit ${exitCode} preserved; log: ${logPath}`);
