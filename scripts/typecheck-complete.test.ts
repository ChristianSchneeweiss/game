import { expect, test } from "bun:test";
import { expectedDiagnostics, verifyDiagnostics } from "./typecheck-complete";

test("complete typecheck accepts only the exact historical diagnostic multiset", () => {
  expect(verifyDiagnostics([...expectedDiagnostics].reverse())).toEqual([]);
});

test("an additional error in an unchecked recorder fails the gate", () => {
  const extra = { ...expectedDiagnostics[0]!, file: "tests/battle/record-forest.ts" };
  expect(verifyDiagnostics([...expectedDiagnostics, extra])).toEqual([
    "Unexpected diagnostic: tests/battle/record-forest.ts:58:13 TS2769",
  ]);
});

test("missing output and a newly excluded historical file fail the gate", () => {
  expect(verifyDiagnostics([])).toHaveLength(expectedDiagnostics.length);
  expect(verifyDiagnostics(expectedDiagnostics.slice(1))).toEqual([
    "Missing historical diagnostic: tests/battle/live-recordings.test.ts:58:13 TS2769",
  ]);
});

test("duplicate diagnostics cannot replace another expected result", () => {
  const actual = [...expectedDiagnostics];
  actual[1] = actual[0]!;
  expect(verifyDiagnostics(actual)).toEqual([
    "Unexpected diagnostic: tests/battle/live-recordings.test.ts:58:13 TS2769",
    "Missing historical diagnostic: tests/battle/live-recordings.test.ts:73:44 TS2769",
  ]);
});

test("a changed signature, code, path, or source span fails closed", () => {
  for (const change of [
    { message: "A different error at the same source location" },
    { code: 2322 },
    { file: "tests/battle/record.ts" },
    { line: 59 },
    { character: 14 },
    { length: 20 },
  ]) {
    const actual = [...expectedDiagnostics];
    actual[0] = { ...actual[0]!, ...change };
    expect(verifyDiagnostics(actual)).toHaveLength(2);
  }
});
