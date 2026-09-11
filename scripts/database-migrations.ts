import { readFileSync } from "node:fs";
import { join } from "node:path";
import type postgres from "postgres";
import { checksum, migrationDirectory, type migrationFiles } from "./database-schema";

export async function applyMigration(sql: ReturnType<typeof postgres>, file: (typeof migrationFiles)[number]) {
  const source = readFileSync(join(migrationDirectory, file), "utf8");
  const digest = checksum(source);
  const [exists] = await sql`SELECT to_regclass('public.release_schema_history') IS NOT NULL AS present`;
  if (exists?.present) {
    const [applied] = await sql`SELECT sha256 FROM release_schema_history WHERE id = ${file}`;
    if (applied) {
      if (applied.sha256 !== digest) throw new Error(`Applied migration checksum changed: ${file}`);
      return false;
    }
  }
  if (!/COMMIT;\s*$/.test(source)) throw new Error(`Migration is missing its transaction boundary: ${file}`);
  // The checked-in manual SQL stays byte-identical. Record its checksum inside
  // the same transaction, so a failed migration cannot leave a success marker.
  const tracked = source.replace(/COMMIT;\s*$/, `
CREATE TABLE IF NOT EXISTS release_schema_history (
  id text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO release_schema_history (id, sha256) VALUES ('${file}', '${digest}');
COMMIT;`);
  try {
    await sql.unsafe(tracked);
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
  return true;
}

export async function schemaShape(sql: ReturnType<typeof postgres>) {
  const columns = await sql`
    SELECT table_name, column_name, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name <> 'release_schema_history'
    ORDER BY table_name, column_name`;
  const constraints = await sql`
    SELECT c.relname AS table_name, k.contype AS kind, pg_get_constraintdef(k.oid) AS definition
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname <> 'release_schema_history'
    ORDER BY c.relname, k.contype, pg_get_constraintdef(k.oid)`;
  return { columns: [...columns], constraints: [...constraints] };
}
