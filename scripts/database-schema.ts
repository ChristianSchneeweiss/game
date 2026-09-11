import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../apps/server/src/db/schema";
import { historicalCommit, repositoryRoot } from "./release-protected";

export const migrationDirectory = resolve(repositoryRoot, "apps/server/migrations/release");
export const checksum = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const migrationFiles = [
  "fresh.sql",
  "audited-3835a60.sql",
  "../manual/20260910_dungeon_attempts.sql",
  "../manual/20260911_dungeon_routes.sql",
] as const;

async function ddl(exports: Record<string, unknown>) {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(exports));
  return `-- Generated from Drizzle schema by scripts/database-schema.ts.\nBEGIN;\n${statements.join("\n")}\nCOMMIT;\n`;
}

export async function generatedSchemas() {
  const directory = mkdtempSync(join(tmpdir(), "loot-production-schema-"));
  try {
    symlinkSync(resolve(repositoryRoot, "node_modules"), join(directory, "node_modules"));
    const sources: Record<string, string> = {};
    for (const file of ["schema.ts", "character-dungeon-data.ts"]) {
      const sourcePath = `apps/server/src/db/${file}`;
      const source = execFileSync("git", ["show", `${historicalCommit}:${sourcePath}`], { cwd: repositoryRoot });
      writeFileSync(join(directory, file), source);
      sources[sourcePath] = checksum(source);
    }
    const historical = await import(pathToFileURL(join(directory, "schema.ts")).href);
    return { fresh: await ddl(schema), audited: await ddl(historical), sources };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export async function verifyMigrationArtifacts() {
  const generated = await generatedSchemas();
  const manifest = JSON.parse(readFileSync(join(migrationDirectory, "manifest.json"), "utf8")) as {
    historicalCommit: string;
    historicalSources: Record<string, string>;
    files: Record<string, string>;
  };
  if (manifest.historicalCommit !== historicalCommit || JSON.stringify(manifest.historicalSources) !== JSON.stringify(generated.sources))
    throw new Error("Audited schema provenance changed.");
  if (readFileSync(join(migrationDirectory, "fresh.sql"), "utf8") !== generated.fresh ||
      readFileSync(join(migrationDirectory, "audited-3835a60.sql"), "utf8") !== generated.audited)
    throw new Error("Release SQL no longer matches the current or audited Drizzle schema; review and regenerate.");
  if (Object.keys(manifest.files).join() !== migrationFiles.join()) throw new Error("Unexpected migration manifest entries.");
  for (const file of migrationFiles) {
    if (checksum(readFileSync(join(migrationDirectory, file))) !== manifest.files[file])
      throw new Error(`Migration checksum mismatch: ${file}`);
  }
  return manifest;
}

if (import.meta.main) {
  if (process.argv.slice(2).join() === "--write") {
    const generated = await generatedSchemas();
    mkdirSync(migrationDirectory, { recursive: true });
    writeFileSync(join(migrationDirectory, "fresh.sql"), generated.fresh);
    writeFileSync(join(migrationDirectory, "audited-3835a60.sql"), generated.audited);
    writeFileSync(join(migrationDirectory, "manifest.json"), JSON.stringify({
      historicalCommit,
      historicalSources: generated.sources,
      files: Object.fromEntries(migrationFiles.map((file) => [file, checksum(readFileSync(join(migrationDirectory, file)))])),
    }, null, 2) + "\n");
  } else if (process.argv.length > 2) throw new Error("Usage: bun scripts/database-schema.ts [--write]");
  await verifyMigrationArtifacts();
  console.log("Current schema, audited 3835a60 schema, and both unchanged manual migrations verified.");
}
