import { describe, expect, test } from "bun:test";
import baseline from "./release-battle-baseline.json";
import { historicalFailures, historicalFile, verifyBattleOutput } from "./release-verify";

const files = Object.keys(baseline).sort();
// Representative raw Bun 1.4.0 failure, preserving the protected recording's
// assertion location while using a portable checkout path.
const diagnostic = `14 | type TargetRequest = Extract<BattleMessage, { type: "getTargets" }>["data"];
15 | 
16 | function currentSpell(bm: BM, data: TargetRequest) {
17 |   if (bm.isGameOver()) throw new Error("This battle has finished.");
18 |   if (data.revision !== undefined && data.revision !== bm.events.length) {
19 |     throw new Error("The battle changed. Choose your spell again.");
                                                                       ^
error: The battle changed. Choose your spell again.
      at currentSpell (/checkout/apps/server/src/battle/commands.ts:19:67)
      at castBattleSpell (/checkout/apps/server/src/battle/commands.ts:60:29)
      at <anonymous> (/checkout/tests/battle/live-recordings.test.ts:72:7)`;

// Bun 1.4.0's raw GitHub Actions format from run 34612302863. The error
// annotation repeats the preceding stack; only the checkout path is portable.
const githubAnnotation = "::error file=apps/server/src/battle/commands.ts,line=19,col=67,title=error: The battle changed. Choose your spell again.::%0A      at currentSpell (/checkout/apps/server/src/battle/commands.ts:19:67)%0A      at castBattleSpell (/checkout/apps/server/src/battle/commands.ts:60:29)%0A      at <anonymous> (/checkout/tests/battle/live-recordings.test.ts:72:7)";

function fileOutput(file: string, count: number) {
  const failures = file === historicalFile ? historicalFailures : [];
  const passes = count - failures.length;
  return [
    file,
    "bun test v1.4.0 (34cbb9a40)",
    `tests/battle/${file}:`,
    ...Array.from({ length: passes }, (_, index) => `(pass) scenario ${index} [1.00ms]`),
    ...failures.map((name) => `${diagnostic}\n(fail) ${name} [1.00ms]`),
    ` ${passes} pass`,
    ` ${failures.length} fail`,
    " 1 expect() calls",
    `Ran ${count} tests across 1 file. [1.00ms]`,
  ].join("\n");
}

const validLog = `${Object.entries(baseline).map(([file, count]) => fileOutput(file, count)).join("\n")}\n25/26 battle test files passed.\nFailed: ${historicalFile}\n`;
const githubLog = validLog
  .replaceAll(/^(tests\/battle\/.+:)$/gm, "::group::$1")
  .replaceAll(/^( \d+ pass)$/gm, "::endgroup::\n$1")
  .replaceAll(diagnostic, `${diagnostic}\n${githubAnnotation}`);

describe("release regression verifier", () => {
  test("accepts only the complete historical baseline and reports exceptions visibly", () => {
    expect(verifyBattleOutput(validLog, 1, files)).toEqual({
      files: 26,
      passed: 560,
      acceptedFailures: historicalFailures,
    });
  });

  test("accepts ANSI decoration and the original package runner wrapper", () => {
    const wrapped = `$ bun tests/battle/run.ts\n${validLog.replaceAll("(pass)", "\u001b[32m(pass)\u001b[0m")}error: script "test:battle" exited with code 1\n`;
    expect(verifyBattleOutput(wrapped, 1, files).passed).toBe(560);
  });

  test("accepts Bun's GitHub Actions groups and exact historical error annotations", () => {
    expect(verifyBattleOutput(githubLog, 1, files)).toEqual({
      files: 26,
      passed: 560,
      acceptedFailures: historicalFailures,
    });
  });

  test("rejects malformed groups and unknown, missing, or changed annotations", () => {
    for (const log of [
      githubLog.replace("::group::tests/battle/assets.test.ts:", "::group::unknown test file"),
      githubLog.replace("::endgroup::\n", ""),
      githubLog.replace("::endgroup::", "::endgroup::\n::endgroup::"),
      githubLog.replace(githubAnnotation, "::error::unrelated async exception"),
      githubLog.replace(githubAnnotation, githubAnnotation.replace("line=19", "line=20")),
      githubLog.replace(githubAnnotation, githubAnnotation.replace("live-recordings.test.ts:72:7", "live-recordings.test.ts:94:7")),
      githubLog.replace(`${githubAnnotation}\n`, ""),
      githubLog.replace(githubAnnotation, `${githubAnnotation}\n::error::unrelated async exception`),
      githubLog.replace("(pass) scenario 0", "(fail) new regression"),
      `${githubLog}::notice::unrecognized trailing output\n`,
    ]) expect(() => verifyBattleOutput(log, 1, files)).toThrow();
  });

  test("requires the original runner's exact exit code", () => {
    for (const exitCode of [0, 2, 137]) {
      expect(() => verifyBattleOutput(validLog, exitCode, files)).toThrow("exit 1");
    }
  });

  test("rejects a newly failing assertion even when the old summary still claims success", () => {
    expect(() => verifyBattleOutput(validLog.replace("(pass) scenario 0", "(fail) new regression"), 1, files)).toThrow("Unexpected failure");
  });

  test("rejects the same historical name with a different error or assertion location", () => {
    for (const log of [
      validLog.replace("error: The battle changed. Choose your spell again.", "error: unauthorized"),
      validLog.replace("live-recordings.test.ts:72:7", "live-recordings.test.ts:94:7"),
      validLog.replace("at castBattleSpell", "at restoreStartingBuilds"),
    ]) expect(() => verifyBattleOutput(log, 1, files)).toThrow();
  });

  test("rejects an unrecognized historical test or duplicate failure", () => {
    expect(() => verifyBattleOutput(validLog.replace(historicalFailures[0]!, "new frozen build regression"), 1, files)).toThrow("Unexpected failure");
    expect(() => verifyBattleOutput(validLog.replace(historicalFailures[1]!, historicalFailures[0]!), 1, files)).toThrow("duplicate");
  });

  test("rejects a missing file on disk, including an unprotected prototype addition", () => {
    expect(() => verifyBattleOutput(validLog, 1, files.filter((file) => file !== "rules/dungeon-route.test.ts"))).toThrow("Missing baseline test file");
  });

  test("rejects a discovered file with no runner output", () => {
    expect(() => verifyBattleOutput(validLog, 1, [...files, "new-regression.test.ts"])).toThrow("expected new-regression.test.ts");
  });

  test("rejects missing test results, summaries, and truncated runner output", () => {
    for (const log of [
      validLog.replace("(pass) scenario 0 [1.00ms]\n", ""),
      validLog.replace(" 38 pass\n", ""),
      validLog.replace("Ran 38 tests across 1 file. [1.00ms]\n", ""),
      validLog.replace("25/26 battle test files passed.\n", ""),
      validLog.slice(0, -30),
    ]) expect(() => verifyBattleOutput(log, 1, files)).toThrow();
  });

  test("rejects reduced per-file coverage even when summaries are consistent", () => {
    const reduced = validLog.replace(fileOutput("assets.test.ts", 38), fileOutput("assets.test.ts", 37));
    expect(() => verifyBattleOutput(reduced, 1, files)).toThrow("Missing test results");
  });

  test("rejects skips, unhandled errors, changed formats, and extra trailing output", () => {
    for (const log of [
      validLog.replace("(pass) scenario 0", "(skip) scenario 0"),
      validLog.replace(" 0 fail\n", " 0 fail\n 1 error\n"),
      validLog.replace("bun test v1.4.0", "bun test v1.4.1"),
      `${validLog}Unexpected crash\n`,
    ]) expect(() => verifyBattleOutput(log, 1, files)).toThrow();
  });

  test("accepts newly added passing files when every result is present", () => {
    const extended = validLog.replace("25/26 battle", `${fileOutput("z-regression.test.ts", 1)}\n26/27 battle`);
    expect(verifyBattleOutput(extended, 1, [...files, "z-regression.test.ts"]).passed).toBe(561);
  });

  test("obsolete raw fault-injection logs cannot hide an unrelated async exception", () => {
    const name = "recoverable completion > workflow creation is retried after a transient failure, including cold recovery";
    const log = validLog.replace(
      "tests/battle/integration/durable.test.ts:\n(pass) scenario 0",
      `tests/battle/integration/durable.test.ts:\nBattle persistence will retry audit-battle 54 | code\nerror: injected workflow create failure\n(pass) ${name}`,
    );
    expect(() => verifyBattleOutput(log, 1, files)).toThrow();
    expect(() => verifyBattleOutput(log.replace("error: injected workflow create failure", "error: injected workflow create failure\nerror: an unrelated async exception must fail the gate\nthis unrecognized output was also swallowed"), 1, files)).toThrow();
  });

  test("safe structured diagnostics cannot hide failure results or new payload fields", () => {
    const diagnostic = '{"event":"battle.delivery_retry","battleId":"audit-battle","revision":5,"failures":1}';
    const log = validLog.replace("tests/battle/integration/durable.test.ts:\n", `tests/battle/integration/durable.test.ts:\n${diagnostic}\n`);
    expect(verifyBattleOutput(log, 1, files).passed).toBe(560);
    expect(() => verifyBattleOutput(log.replace(diagnostic, diagnostic.replace('"failures":1', '"error":"private SQL"')), 1, files)).toThrow();
    expect(() => verifyBattleOutput(log.replace(diagnostic, '{"event":"battle.new_unreviewed_event"}'), 1, files)).toThrow();
    expect(() => verifyBattleOutput(log.replace(diagnostic, `${diagnostic}\nerror: unrelated async exception`), 1, files)).toThrow();
    expect(() => verifyBattleOutput(log.replace("(pass) scenario 0", "(fail) real failure"), 1, files)).toThrow();
  });
});
