import baseline from "./release-battle-baseline.json";

export const historicalFile = "live-recordings.test.ts";
export const historicalFailures = [
  "live-six-entity",
  "live-milestone-2",
  "live-milestone-3",
].map((name) => `${name}: authenticated browser recording agrees with persisted results and frozen-build restoration`);

const historicalSource = [
  'type TargetRequest = Extract<BattleMessage, { type: "getTargets" }>["data"];',
  "",
  "function currentSpell(bm: BM, data: TargetRequest) {",
  'if (bm.isGameOver()) throw new Error("This battle has finished.");',
  "if (data.revision !== undefined && data.revision !== bm.events.length) {",
  'throw new Error("The battle changed. Choose your spell again.");',
];

function testResult(line: string) {
  const match = /^\((pass|fail)\) (.+?)(?: \[\d+(?:\.\d+)?(?:ms|s|µs|us)\])?$/.exec(line);
  return match ? { status: match[1], name: match[2] } : undefined;
}

function knownDiagnostic(line: string) {
  if (!line.startsWith('{"event":')) return false;
  const value: unknown = JSON.parse(line);
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (!["request.failed", "rpc.failed", "battle.command_rejected", "battle.recovered", "battle.delivery_retry", "battle.delivery_complete"].includes(String(record.event))) return false;
  return Object.entries(record).every(([key, field]) => {
    if (key === "event") return true;
    if (key === "battleId" || key === "version") return typeof field === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(field);
    if (key === "revision" || key === "failures") return typeof field === "number" && Number.isSafeInteger(field) && field >= 0;
    return false;
  });
}

/** Parse the pinned Bun runner format, including every per-file and final result.
 * Console diagnostics use the closed structured schema or the documented
 * Three.js warning; they are never test exceptions.
 */
export function verifyBattleOutput(log: string, exitCode: number, files: string[]) {
  const expectedFiles = [...files].sort();
  if (new Set(files).size !== files.length) throw new Error("Duplicate expected test files.");
  for (const file of Object.keys(baseline)) {
    if (!expectedFiles.includes(file)) throw new Error(`Missing baseline test file: ${file}`);
  }
  if (exitCode !== 1) throw new Error(`Expected historical runner exit 1, received ${exitCode}.`);
  const lines = log.replace(/\u001b\[[0-9;]*m/g, "").split(/\r?\n/).filter((line) => line.trim());
  let cursor = 0;
  const next = () => lines[cursor++] ?? "<missing output>";
  const expectLine = (expected: string | RegExp) => {
    const line = next();
    if (typeof expected === "string" ? line !== expected : !expected.test(line)) {
      throw new Error(`Unrecognized or missing output at line ${cursor}: ${line}; expected ${expected}`);
    }
    return line;
  };
  // Accept captures made through the existing package script as well as direct
  // runner captures, without admitting arbitrary shell/script error messages.
  if (lines[0] === "$ bun tests/battle/run.ts") cursor++;
  let passed = 0;
  const accepted = new Set<string>();
  for (const file of expectedFiles) {
    expectLine(file);
    expectLine(/^bun test v1\.4\.0 \([a-f\d]+\)$/);
    expectLine(`tests/battle/${file}:`);
    let filePasses = 0;
    let fileFailures = 0;
    const names = new Set<string>();
    while (cursor < lines.length && !/^ \d+ pass$/.test(lines[cursor]!)) {
      const line = lines[cursor]!;
      if (knownDiagnostic(line)) {
        cursor++;
        continue;
      }
      if (file === "model-loading.test.tsx" && /^\(node:\d+\) \[THREE_CJS_DEPRECATED\]/.test(line)) {
        expectLine(/^\(node:\d+\) \[THREE_CJS_DEPRECATED\] DeprecationWarning: `require\("three"\)` is deprecated and will be removed\.$/);
        expectLine('Replace `const THREE = require("three")` with `import * as THREE from "three"`.');
        expectLine('(Use `bun --trace-warnings ...` to show where the warning was created)');
        continue;
      }
      let failureSignature = false;
      if (file === historicalFile && /^\d+ \|/.test(line)) {
        for (const source of historicalSource) {
          const actual = expectLine(/^\d+ \|/).replace(/^\d+ \|\s?/, "").trim();
          if (actual !== source) throw new Error(`Changed historical failure source: ${actual}`);
        }
        expectLine(/^ +\^$/);
        expectLine("error: The battle changed. Choose your spell again.");
        expectLine(/^ +at currentSpell \([^\n()]+\/apps\/server\/src\/battle\/commands\.ts:\d+:\d+\)$/);
        expectLine(/^ +at castBattleSpell \([^\n()]+\/apps\/server\/src\/battle\/commands\.ts:\d+:\d+\)$/);
        expectLine(/^ +at <anonymous> \([^\n()]+\/tests\/battle\/live-recordings\.test\.ts:72:7\)$/);
        failureSignature = true;
      }
      const result = testResult(next());
      if (!result || names.has(result.name)) throw new Error(`Missing, duplicate, or unrecognized test result in ${file}: ${lines[cursor - 1]}`);
      names.add(result.name);
      if (result.status === "fail") {
        if (file !== historicalFile || !failureSignature || !historicalFailures.includes(result.name) || accepted.has(result.name)) {
          throw new Error(`Unexpected failure or changed failure signature: ${file}: ${result.name}`);
        }
        accepted.add(result.name);
        fileFailures++;
      } else {
        if (failureSignature) throw new Error(`Historical error followed by a passing result: ${result.name}`);
        filePasses++;
      }
    }
    expectLine(` ${filePasses} pass`);
    expectLine(` ${fileFailures} fail`);
    expectLine(/^ \d+ expect\(\) calls$/);
    const count = filePasses + fileFailures;
    const minimum = (baseline as Record<string, number>)[file] ?? 1;
    if (count < minimum) throw new Error(`Missing test results in ${file}: expected at least ${minimum}, received ${count}.`);
    expectLine(new RegExp(`^Ran ${count} tests? across 1 file\\. \\[\\d+(?:\\.\\d+)?(?:ms|s)\\]$`));
    passed += filePasses;
  }
  if (accepted.size !== historicalFailures.length) throw new Error("Missing historical failure results; review the baseline instead of silently changing it.");
  expectLine(`${files.length - 1}/${files.length} battle test files passed.`);
  expectLine(`Failed: ${historicalFile}`);
  if (lines[cursor] === 'error: script "test:battle" exited with code 1') cursor++;
  if (cursor !== lines.length) throw new Error(`Unrecognized trailing output: ${lines[cursor]}`);
  return { files: files.length, passed, acceptedFailures: [...accepted] };
}
