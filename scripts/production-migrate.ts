import assert from "node:assert/strict";
import postgres from "postgres";
import { applyMigration, schemaShape } from "./database-migrations";
import { checksum, verifyMigrationArtifacts } from "./database-schema";

const operation = process.argv[2] ?? "inspect";
if (!["inspect", "fresh", "upgrade"].includes(operation)) throw new Error("Usage: production-migrate.ts inspect|fresh|upgrade");
let url: URL;
try { url = new URL(process.env.RELEASE_DATABASE_URL ?? ""); }
catch { throw new Error("RELEASE_DATABASE_URL must be a valid PostgreSQL URL; value omitted."); }
if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hash ||
    [...url.searchParams.keys()].some((key) => key !== "sslmode"))
  throw new Error("Expected a PostgreSQL release connection; only the sslmode query option is supported.");
const expectedHost = process.env.RELEASE_EXPECTED_HOST;
const expectedDatabase = process.env.RELEASE_EXPECTED_DATABASE;
assert(expectedHost && expectedDatabase, "Set RELEASE_EXPECTED_HOST (including port when present) and RELEASE_EXPECTED_DATABASE explicitly.");
assert.equal(url.host, expectedHost, "Release database host does not match the reviewed target");
assert.equal(decodeURIComponent(url.pathname.slice(1)), expectedDatabase, "Release database name does not match the reviewed target");
const sql = postgres(url.href, { max: 1, connect_timeout: 10, connection: { application_name: "loot-production-migration", lock_timeout: 5000, statement_timeout: 60000 } });
try {
  await verifyMigrationArtifacts();
  const [identity] = await sql`SELECT current_database() AS database, current_user AS role, current_setting('server_version') AS version`;
  assert.equal(identity!.database, expectedDatabase);
  const shape = await schemaShape(sql);
  const fingerprint = checksum(JSON.stringify(shape));
  console.log(JSON.stringify({ host: url.host, ...identity, schemaSha256: fingerprint, operation }));
  if (operation !== "inspect") {
    assert.equal(process.env.RELEASE_EXPECTED_SCHEMA_SHA256, fingerprint, "Set the reviewed schema fingerprint from matching rehearsal evidence; inspect unknown schemas before writing");
    if (operation === "fresh") {
      assert.equal(shape.columns.length, 0, "Fresh installation requires an empty application schema");
      await applyMigration(sql, "fresh.sql");
    } else {
      await applyMigration(sql, "../manual/20260910_dungeon_attempts.sql");
      await applyMigration(sql, "../manual/20260911_dungeon_routes.sql");
    }
    console.log("Release SQL committed with transactional checksum history.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
