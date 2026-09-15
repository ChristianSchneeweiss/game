import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type postgres from "postgres";
import seedrandom from "seedrandom";
import { rollDungeonRoute } from "../apps/game/src/dungeons/route-catalog";
import { proveConcurrency } from "./database-concurrency";
import { proveSocialConcurrency } from "./database-social-concurrency";
import { proveAbandonmentConcurrency } from "./database-abandonment-concurrency";
import { applyMigration, schemaShape } from "./database-migrations";
import { checksum, migrationDirectory, verifyMigrationArtifacts } from "./database-schema";
import { connection, disposableTarget, verifyConnection } from "./database-target";

const target = disposableTarget();
const admin = connection(target, "loot_production_admin", "loot-proof-admin");
const artifacts = process.env.RELEASE_ARTIFACT_DIR
  ? resolve(process.env.RELEASE_ARTIFACT_DIR)
  : mkdtempSync(join(tmpdir(), "loot-production-evidence-"));
mkdirSync(artifacts, { recursive: true });
const created: string[] = [];
const clients: ReturnType<typeof postgres>[] = [];
const suffix = `${Date.now()}_${process.pid}`;
const evidence: Record<string, unknown> = { startedAt: new Date().toISOString(), artifactDirectory: artifacts };

async function database(label: string) {
  const name = `loot_production_${label}_${suffix}`;
  await admin.unsafe(`CREATE DATABASE "${name}" TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`);
  created.push(name);
  const sql = connection(target, name, `loot-proof-${label}`);
  clients.push(sql);
  await verifyConnection(sql, name);
  return { name, sql };
}

async function legacyFixture(sql: ReturnType<typeof postgres>) {
  await sql`INSERT INTO "user" (id, username) VALUES ('legacy-owner', 'legacy-owner')`;
  await sql`INSERT INTO character (id, user_id, name, health, mana, intelligence, vitality, agility, strength)
    VALUES ('legacy-hero', 'legacy-owner', 'Legacy hero', 100, 50, 10, 10, 10, 10)`;
  await sql`INSERT INTO dungeon_data (id, key, created_by, round, character_data)
    VALUES ('legacy-run', 'dungeon1', 'legacy-owner', 1, '[{"characterId":"legacy-hero","health":37,"mana":9}]')`;
  await sql`INSERT INTO dungeon_battle (id, dungeon_id, battle_id, round)
    VALUES ('legacy-attempt', 'legacy-run', 'legacy-battle', 0)`;
  await savedResult(sql);
  await sql`INSERT INTO loot (id, battle_id, user_id, items, gold)
    VALUES ('legacy-loot', 'legacy-battle', 'legacy-owner', '[{"type":"ITEM","dropRate":0.2,"data":{"itemType":"iron-sword"}}]', 12)`;
  await sql`INSERT INTO equipment_stats (id, user_id, type, equipped_by)
    VALUES ('legacy-gear', 'legacy-owner', 'iron-sword', 'legacy-hero')`;
}

async function savedResult(sql: ReturnType<typeof postgres>) {
  await sql`INSERT INTO battle_result (battle_id, timeline_data, start_entity_data, participants, effect_tracking, winner, team_a, team_b)
    VALUES ('legacy-battle', '{"saved":"events"}', '{}', '{"saved":"builds"}', '{}', 'TEAM_A', '[{"id":"legacy-hero","health":37,"mana":9,"dead":false}]', '[]')`;
}

async function rows(sql: ReturnType<typeof postgres>) {
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  const result: Record<string, string[]> = {};
  for (const table of tables) {
    const name = String(table.tablename);
    assert(/^[a-z_]+$/.test(name));
    result[name] = (await sql.unsafe(`SELECT to_jsonb(t)::text AS row FROM "${name}" t ORDER BY to_jsonb(t)::text`)).map((row) => String(row.row));
  }
  return result;
}

function backupTool(tool: "pg_dump" | "pg_restore", database: string, input?: Buffer) {
  const container = process.env.TEST_PG_CONTAINER;
  const args = tool === "pg_dump"
    ? ["--format=custom", "--no-owner", "--no-acl", "--dbname", database]
    : ["--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", "--dbname", database];
  if (container) {
    if (!/^loot-production-[a-z0-9-]+$|^[a-f0-9]{64}$/.test(container)) throw new Error("Refusing an unrelated PostgreSQL container.");
    return execFileSync("docker", ["exec", "-i", container, tool, "--username", decodeURIComponent(target.username), ...args], {
      input, maxBuffer: 32 * 1024 * 1024,
    });
  }
  return execFileSync(tool, args, {
    input, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PGHOST: target.hostname, PGPORT: target.port || "5432", PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password) },
  });
}

try {
  evidence.server = await verifyConnection(admin, "loot_production_admin");
  evidence.migrations = await verifyMigrationArtifacts();
  const fresh = await database("fresh");
  const upgrade = await database("upgrade");
  const interrupted = await database("interrupted");
  const restore = await database("restore");

  const freshSql = readFileSync(join(migrationDirectory, "fresh.sql"), "utf8");
  await assert.rejects(interrupted.sql.unsafe(freshSql.replace(/COMMIT;\s*$/, "SELECT 1 / 0; COMMIT;")));
  await interrupted.sql`ROLLBACK`;
  assert.deepEqual(await schemaShape(interrupted.sql), { columns: [], constraints: [] });
  evidence.interruptedFreshInstall = "Injected error after DDL rolled back every table and constraint";

  assert.equal(await applyMigration(fresh.sql, "fresh.sql"), true);
  assert.equal(await applyMigration(fresh.sql, "fresh.sql"), false);
  const currentShape = await schemaShape(fresh.sql);
  await applyMigration(upgrade.sql, "audited-3835a60.sql");
  await legacyFixture(upgrade.sql);
  const legacyShape = await schemaShape(upgrade.sql);
  evidence.schemaFingerprints = {
    empty: checksum(JSON.stringify({ columns: [], constraints: [] })),
    audited: checksum(JSON.stringify(legacyShape)),
    current: checksum(JSON.stringify(currentShape)),
  };
  const legacyRows = await rows(upgrade.sql);
  const attemptMigration = "../manual/20260910_dungeon_attempts.sql";

  await upgrade.sql`UPDATE dungeon_data SET active_battle = true`;
  await assert.rejects(applyMigration(upgrade.sql, attemptMigration), /Finish active dungeon attempts/);
  await upgrade.sql`UPDATE dungeon_data SET active_battle = false`;
  await upgrade.sql`DELETE FROM battle_result WHERE battle_id = 'legacy-battle'`;
  await assert.rejects(applyMigration(upgrade.sql, attemptMigration), /Legacy attempts without a saved result/);
  await savedResult(upgrade.sql);
  await upgrade.sql`INSERT INTO dungeon_battle (id, dungeon_id, battle_id, round) VALUES ('duplicate-attempt', 'legacy-run', 'legacy-battle', 0)`;
  await assert.rejects(applyMigration(upgrade.sql, attemptMigration), /Duplicate dungeon battle IDs/);
  await upgrade.sql`DELETE FROM dungeon_battle WHERE id = 'duplicate-attempt'`;
  await upgrade.sql`INSERT INTO loot (id, battle_id, user_id, items, gold) VALUES ('duplicate-loot', 'legacy-battle', 'legacy-owner', '[]', 12)`;
  await assert.rejects(applyMigration(upgrade.sql, attemptMigration), /Duplicate battle rewards/);
  await upgrade.sql`DELETE FROM loot WHERE id = 'duplicate-loot'`;
  assert.deepEqual(await schemaShape(upgrade.sql), legacyShape);
  assert.deepEqual(await rows(upgrade.sql), legacyRows);
  evidence.upgradePreflight = "Active attempts, missing results, duplicate attempts, and duplicate rewards each rejected with unchanged legacy schema/data";

  const manual = readFileSync(join(migrationDirectory, attemptMigration), "utf8");
  await assert.rejects(upgrade.sql.unsafe(manual.replace(/COMMIT;\s*$/, "SELECT 1 / 0; COMMIT;")));
  await upgrade.sql`ROLLBACK`;
  assert.deepEqual(await schemaShape(upgrade.sql), legacyShape);
  assert.deepEqual(await rows(upgrade.sql), legacyRows);
  evidence.interruptedUpgrade = "Injected post-DDL error rolled back new columns, completion markers, constraints, and snapshot table";

  await applyMigration(upgrade.sql, attemptMigration);
  await applyMigration(upgrade.sql, "../manual/20260911_dungeon_routes.sql");
  await applyMigration(upgrade.sql, "../manual/20260914_shared_preparation.sql");
  await applyMigration(upgrade.sql, "../manual/20260914_social.sql");
  const beforeItemsShape = await schemaShape(upgrade.sql);
  const beforeItemsRows = await rows(upgrade.sql);
  const itemMigration = "../manual/20260915_item_stacks.sql";
  const itemSql = readFileSync(join(migrationDirectory, itemMigration), "utf8");
  await assert.rejects(
    upgrade.sql.unsafe(itemSql.replace(/COMMIT;\s*$/, "SELECT 1 / 0; COMMIT;")),
  );
  await upgrade.sql`ROLLBACK`;
  assert.deepEqual(await schemaShape(upgrade.sql), beforeItemsShape);
  assert.deepEqual(await rows(upgrade.sql), beforeItemsRows);
  assert.equal(await applyMigration(upgrade.sql, itemMigration), true);
  assert.equal(await applyMigration(upgrade.sql, itemMigration), false);
  assert.deepEqual(await schemaShape(upgrade.sql), currentShape);
  const [legacyRun] = await upgrade.sql`SELECT active_battle_id, route, character_data FROM dungeon_data WHERE id = 'legacy-run'`;
  assert.equal(legacyRun!.active_battle_id, null);
  assert.equal(legacyRun!.route, null);
  assert.deepEqual(legacyRun!.character_data, [{ characterId: "legacy-hero", health: 37, mana: 9 }]);
  const [legacyAttempt] = await upgrade.sql`SELECT completed_at FROM dungeon_battle WHERE battle_id = 'legacy-battle'`;
  assert(legacyAttempt!.completed_at);
  assert.deepEqual((await rows(upgrade.sql)).battle_result, legacyRows.battle_result);
  assert.deepEqual(
    (await rows(upgrade.sql)).equipment_stats,
    legacyRows.equipment_stats,
  );
  assert.deepEqual((await rows(upgrade.sql)).loot, legacyRows.loot);
  await upgrade.sql`INSERT INTO item_stack (user_id, type, quantity) VALUES ('legacy-owner', 'test-material', 7)`;
  await assert.rejects(
    upgrade.sql`INSERT INTO item_stack (user_id, type, quantity) VALUES ('legacy-owner', 'test-material', 1)`,
  );
  await assert.rejects(
    upgrade.sql`INSERT INTO item_stack (user_id, type, quantity) VALUES ('missing-owner', 'test-supply', 1)`,
  );
  await assert.rejects(upgrade.sql`UPDATE item_stack SET quantity = 0`);
  await assert.rejects(upgrade.sql`UPDATE item_stack SET quantity = -1`);
  await assert.rejects(
    upgrade.sql`UPDATE item_stack SET quantity = 2147483648`,
  );
  assert.equal(
    (await upgrade.sql`SELECT quantity FROM item_stack`)[0]!.quantity,
    7,
  );
  evidence.itemMigration =
    "Interrupted stack migration rolls back; upgrade preserves equipment IDs, assignments and legacy loot; owner/type uniqueness, owner FK, positive integer range and repeat application verified";
  await assert.rejects(upgrade.sql`INSERT INTO dungeon_battle (id, dungeon_id, battle_id, round) VALUES ('duplicate', 'legacy-run', 'legacy-battle', 0)`);
  await assert.rejects(upgrade.sql`INSERT INTO loot (id, battle_id, user_id, items, gold) VALUES ('duplicate', 'legacy-battle', 'legacy-owner', '[]', 0)`);
  const savedRoute = rollDungeonRoute(2, seedrandom("migration-restore-proof"));
  await upgrade.sql`UPDATE dungeon_data SET route = ${upgrade.sql.json(savedRoute)} WHERE id = 'legacy-run'`;
  assert.equal(await applyMigration(upgrade.sql, "../manual/20260911_dungeon_routes.sql"), false);
  assert.deepEqual((await upgrade.sql`SELECT route FROM dungeon_data WHERE id = 'legacy-run'`)[0]!.route, savedRoute);
  evidence.upgrade = "Exact manual migrations match fresh schema; historical completion/resources/results preserved, NULL routes remain linear, uniqueness enforced, repeat migration preserves existing route state";

  const archive = backupTool("pg_dump", upgrade.name);
  writeFileSync(join(artifacts, "synthetic-upgrade-backup.dump"), archive);
  backupTool("pg_restore", restore.name, archive);
  assert.deepEqual(await schemaShape(restore.sql), await schemaShape(upgrade.sql));
  assert.deepEqual(await rows(restore.sql), await rows(upgrade.sql));
  evidence.backupRestore = { bytes: archive.length, result: "pg_dump custom archive restored with pg_restore; every table row, constraint, column and migration-history row agrees" };

  evidence.concurrency = await proveConcurrency(target, fresh.name);
  evidence.socialConcurrency = await proveSocialConcurrency(target, fresh.name);
  evidence.abandonmentConcurrency = await proveAbandonmentConcurrency(target, fresh.name);
  evidence.result = "PASS";
  console.log("PostgreSQL proof passed: fresh install, audited upgrade, preflights, interrupted transactions, backup restoration, and concurrent run/social operations.");
} catch (error) {
  evidence.result = "FAIL";
  evidence.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
  console.error(`PostgreSQL proof failed: ${evidence.error}`);
} finally {
  await Promise.all(clients.map((sql) => sql.end({ timeout: 5 })));
  for (const name of created.reverse()) await admin.unsafe(`DROP DATABASE "${name}"`);
  await admin.end({ timeout: 5 });
  evidence.finishedAt = new Date().toISOString();
  evidence.disposableDatabasesRemoved = created;
  writeFileSync(join(artifacts, "postgresql-proof.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log(`Synthetic PostgreSQL evidence retained in ${artifacts}`);
}
