import { relative, resolve } from "node:path";
import ts from "typescript";
import historicalDiagnostics from "./typecheck-historical-diagnostics.json";

export type DiagnosticIdentity = {
  file: string;
  line: number;
  character: number;
  code: number;
  length: number;
  message: string;
};

export const expectedDiagnostics: readonly DiagnosticIdentity[] = historicalDiagnostics;

function diagnosticKey(diagnostic: DiagnosticIdentity): string {
  const { file, line, character, code, length, message } = diagnostic;
  return JSON.stringify([file, line, character, code, length, message]);
}

function location(diagnostic: DiagnosticIdentity): string {
  return `${diagnostic.file}:${diagnostic.line}:${diagnostic.character} TS${diagnostic.code}`;
}

/** Every immutable historical diagnostic must match once; all others fail. */
export function verifyDiagnostics(
  actual: readonly DiagnosticIdentity[],
  expected: readonly DiagnosticIdentity[] = expectedDiagnostics,
): string[] {
  const remaining = [...expected];
  const failures: string[] = [];
  for (const diagnostic of actual) {
    const match = remaining.findIndex(
      (candidate) => diagnosticKey(candidate) === diagnosticKey(diagnostic),
    );
    if (match === -1) failures.push(`Unexpected diagnostic: ${location(diagnostic)}`);
    else remaining.splice(match, 1);
  }
  for (const diagnostic of remaining)
    failures.push(`Missing historical diagnostic: ${location(diagnostic)}`);
  return failures;
}

function identity(diagnostic: ts.Diagnostic, root: string): DiagnosticIdentity {
  const position = diagnostic.file && diagnostic.start !== undefined
    ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
    : undefined;
  return {
    file: diagnostic.file
      ? relative(root, diagnostic.file.fileName).replaceAll("\\", "/")
      : "<configuration>",
    line: position ? position.line + 1 : 0,
    character: position ? position.character + 1 : 0,
    code: diagnostic.code,
    length: diagnostic.length ?? 0,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
  };
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  const config = ts.getParsedCommandLineOfConfigFile(
    resolve(root, "tsconfig.battle-all.json"),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic(diagnostic) {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
      },
    },
  );
  if (!config) throw new Error("Complete typecheck configuration could not be read");
  const program = ts.createProgram(config.fileNames, config.options);
  const diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)];
  // Keep every diagnostic in the release log; this is not a clean tsc result.
  console.log(ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => root,
    getNewLine: () => "\n",
  }));
  const failures = verifyDiagnostics(diagnostics.map((diagnostic) => identity(diagnostic, root)));
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  } else {
    console.log(
      `Complete type coverage passed with exactly ${expectedDiagnostics.length} visible protected-test diagnostics (${config.fileNames.length} root files, TypeScript ${ts.version}).`,
    );
  }
}
