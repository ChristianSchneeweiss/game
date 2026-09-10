import { resolve } from "node:path";

// Bun's module mocks and browser globals are process-wide. Run each test file
// separately so the Durable Object adapter and mounted React tests cannot leak.
const root = import.meta.dir;
const filters = process.argv.slice(2);
const files = [...new Bun.Glob("**/*.test.{ts,tsx}").scanSync(root)]
  .filter((file) => !filters.length || filters.some((filter) => file.includes(filter)))
  .sort();
if (!files.length) throw new Error(`No battle tests match: ${filters.join(", ")}`);

const failed: string[] = [];
for (const file of files) {
  process.stdout.write(`\n${file}\n`);
  const child = Bun.spawn([
    process.execPath, "test", "--timeout", "15000",
    "--preload", resolve(root, "support/quiet.ts"), resolve(root, file),
  ], { cwd: resolve(root, "../.."), stdout: "inherit", stderr: "inherit" });
  if (await child.exited !== 0) failed.push(file);
}
process.stdout.write(`\n${files.length - failed.length}/${files.length} battle test files passed.\n`);
if (failed.length) process.stderr.write(`Failed: ${failed.join(", ")}\n`);
process.exitCode = failed.length ? 1 : 0;
