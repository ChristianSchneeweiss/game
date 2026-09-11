import postgres from "postgres";

/** This rehearsal can only create and destroy its own named local databases. */
export function disposableTarget(value = process.env.TEST_DATABASE_URL) {
  if (!value) throw new Error("Set TEST_DATABASE_URL to a dedicated local loot_production_admin database.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL; value omitted."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.pathname !== "/loot_production_admin" || url.search || url.hash)
    throw new Error("Refusing database writes: the target must be loopback /loot_production_admin without query overrides.");
  return url;
}

export function connection(target: URL, database: string, applicationName: string) {
  if (!/^loot_production_[a-z0-9_]+$/.test(database)) throw new Error("Invalid disposable database name.");
  const url = new URL(target);
  url.pathname = `/${database}`;
  return postgres(url.href, {
    max: 1, connect_timeout: 5, idle_timeout: 5,
    connection: { application_name: applicationName, statement_timeout: 15000, lock_timeout: 10000 },
    onnotice: () => {},
  });
}

export async function verifyConnection(sql: ReturnType<typeof postgres>, expected: string) {
  const [identity] = await sql`SELECT current_database() AS database, current_setting('server_version') AS version, current_setting('lc_collate') AS collation, pg_backend_pid() AS pid`;
  if (identity?.database !== expected) throw new Error("Database identity mismatch; aborting rehearsal.");
  return { database: String(identity.database), version: String(identity.version), collation: String(identity.collation), pid: Number(identity.pid) };
}
