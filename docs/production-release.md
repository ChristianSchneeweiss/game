# Release, migration, and recovery runbook

This is the production-candidate procedure. **No staging or production deployment has been performed.** The local PostgreSQL proof is executable; actual Cloudflare account, staging database, Clerk instance, KV namespace, and hosting origin still need target-specific verification and release authorization. Track completion in the [release checklist](release-checklist.md) and retain results in [release evidence](release-evidence.md).

## Reproduce the local database proof

Run from the repository root with Node 22.19.0, Bun 1.4.0, Docker, and the locked dependencies. Start a disposable PostgreSQL container on a loopback port. This example uses a supported PostgreSQL 15 patch image; use the target's actual major version when qualifying its release.

```sh
docker run --detach --rm --name loot-production-local-proof \
  --publish 127.0.0.1:55439:5432 \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  --env POSTGRES_DB=loot_production_admin postgres:15.19-alpine
docker exec loot-production-local-proof pg_isready -U postgres -d loot_production_admin
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55439/loot_production_admin \
TEST_PG_CONTAINER=loot-production-local-proof \
VITE_CLERK_PUBLISHABLE_KEY=pk_test_bG9vdC1jaS5jbGVyay5hY2NvdW50cy5kZXYk \
RELEASE_ARTIFACT_DIR=/tmp/loot-production-evidence bun run release:check
docker stop loot-production-local-proof
```

The loopback-only, passwordless database contains synthetic fixtures and is removed after the proof. The public Clerk value above is a synthetic compilation key; it cannot authenticate a browser session. Do not reuse these settings for shared infrastructure. `database-rehearsal.ts` rejects non-loopback URLs, database names other than `loot_production_admin`, and connection query overrides. It creates uniquely named `loot_production_*` databases, verifies their identities, and removes those databases in cleanup. The existing local `game` database is never selected.

Each operation uses its own PostgreSQL connection. The suite holds a row in a third transaction and observes both clients waiting in `pg_stat_activity` before releasing it. It checks overlapping starts; path choice versus start; duplicate completion/rewards; duplicate inventory claims; weapon replacement; mixed-case two-character snapshots versus passive transfers; equipment removal versus snapshots; and XP grants from two different runs. Mixed-case fixtures use explicit `C` collation to expose inconsistent JavaScript/database lock ordering.

The first local proof on 11 September 2026 used the already-installed PostgreSQL **15.3** image, isolated from the existing container, and matching container-provided `pg_dump`/`pg_restore`. That proves these operations on 15.3; it does not qualify an unidentified deployment version. The new CI service uses 15.19 and requires its first remote result to establish that additional evidence.

`postgresql-proof.json` records server version, independent backend IDs, lock waits, schema fingerprints, results, and cleanup. `synthetic-upgrade-backup.dump` contains only the synthetic upgraded fixture. CI retains both alongside the raw battle log. The backup proof compares every table row, column, constraint, and migration-history entry after an actual custom-format dump and restore. Production backup policy additionally needs provider retention/PITR and a practiced restoration procedure. See PostgreSQL's [pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html).

## Schema sources and preflight

`apps/server/migrations/release/fresh.sql` is generated from the current Drizzle schema. `audited-3835a60.sql` is generated from the exact historical schema and custom-column sources at `3835a6098bd0081e5ac942ae78557a1edf4ae51c`; it is an **upgrade-test fixture**, not a migration to apply to an existing database. `manifest.json` records source and SQL checksums. `bun run check:migrations` regenerates both SQL descriptions in memory and rejects drift. Intentional schema changes use `bun scripts/database-schema.ts --write` followed by the entire database proof and review.

The rehearsal applies these existing, unchanged migrations in order:

1. `20260910_dungeon_attempts.sql`: requires drained legacy attempts, creates frozen-build storage, adds active-attempt identity and completion markers, and enforces reward/attempt uniqueness.
2. `20260911_dungeon_routes.sql`: adds nullable persisted routes; old runs retain `NULL` and stay linear.

The old generated `0000`–`0005` chain does not describe the audited deployed schema. Do not replay it as a substitute. Compare the actual target schema with the audited or current fingerprint in the **same candidate's** PostgreSQL proof. Any other schema requires reconciliation before applying these commands.

The proof rejects active runs, missing historical results, duplicate battle identities, and duplicate per-owner rewards without changing legacy data. It also injects errors after the DDL and verifies complete transactional rollback for fresh installation and upgrade. `release/preflight.sql` provides read-only target/schema inspection and the four legacy-state queries; all four state queries must return no rows.

## Isolated development and staging configuration

Copy `apps/server/.dev.vars.example` to ignored `apps/server/.dev.vars`, fill it with a dedicated loopback `loot_development_*` database URL and **Clerk test keys**, and apply `fresh.sql` to that empty synthetic database. `bun run dev:isolated` uses the guarded local starter for both services, with ports 3000 and 3001; `bun run dev:server:local` and `bun run dev:client:local` start them individually. It passes `--local` to the separate `wrangler.local.jsonc`, disables remote bindings, stores local Durable Object/KV state separately, and gives the client only the public Clerk key. It refuses the existing `game` database and the rehearsal admin database. Stop an existing server yourself before replacing its session; the starter never kills another process.

Ordinary `bun dev`, `bun run dev:server`, and `bun run dev:client` retain the existing Doppler setup and root Wrangler configuration, including its remote KV setting. The explicitly named `dev:prd`/deployment wrappers are also retained. A FIFO mounted by Doppler is not a regular `.dev.vars` configuration file for the isolated starter.

Copy `wrangler.staging.example.jsonc` to ignored `wrangler.staging.jsonc` only after identifying a real, separate staging account/project target. The empty account/KV identifiers are intentional blockers. Staging needs its own Worker name, `BATTLE_WEBSOCKET`/`BATTLE_CHAT` namespaces, `BATTLE_DONE_WORKFLOW`, `GAME` KV, database, Clerk keys, assets, and telemetry environment. Cloudflare notes that bindings and variables need explicit environment configuration; see [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/).

For a local bundle-only verification with no environment secrets:

```sh
WRANGLER_LOG_PATH=/tmp/loot-worker-dry-run.log WRANGLER_SEND_METRICS=false \
node node_modules/wrangler/bin/wrangler.js deploy --dry-run \
  --config apps/server/wrangler.local.jsonc --env-file /dev/null \
  --outdir /tmp/loot-worker-dry-run
```

This compiles code and checks the declared bindings; it does not execute Cloudflare scheduling, alarms, hibernation, or authentication.

## Target-specific release sequence

Before authorization, record the candidate commit, CI result, actual database host/name/version, Cloudflare account/Worker/binding IDs, Clerk instance, previous Worker version, known-compatible rollback commit, backup location/checksum, and intended origin in the release evidence. Do not invent missing identifiers.

1. Build the candidate with the verified staging public key and neutral `build:client` command. Inspect bundle warnings and confirm development galleries and private configuration are absent.
2. Verify account identity and all bindings against the isolated staging configuration. Establish a maintenance/drain procedure that prevents new starts and completion writes, and test how operators restore service. There is no implemented universal maintenance switch; its target-specific mechanism remains a staging prerequisite.
3. Drain active attempts and completion obligations. Disconnect clients for the cutover. Capture a database backup, verify its checksum, restore it into a separate database, and inspect both saved results and inventory.
4. Set `RELEASE_DATABASE_URL` through the intended secret source, plus `RELEASE_EXPECTED_HOST` and `RELEASE_EXPECTED_DATABASE`. Keep values out of terminal history and artifacts. `bun scripts/production-migrate.ts inspect` is read-only and prints target identity and a schema fingerprint.
5. Match that fingerprint to the audited or empty schema fingerprint in the candidate's successful rehearsal. Set `RELEASE_EXPECTED_SCHEMA_SHA256` to the reviewed value. After release authorization, use `bun scripts/production-migrate.ts fresh` **only for an empty installation**, or `bun scripts/production-migrate.ts upgrade` **only for the audited legacy schema**. Both manual steps retain their transactions; each checksum/history entry commits with its SQL. Unknown or partially upgraded schemas require an explicit reconciliation plan.
6. Provision only the known staging secrets, then deploy using `node node_modules/wrangler/bin/wrangler.js deploy --config apps/server/wrangler.staging.jsonc --env-file /dev/null`. This is an operator release action, not part of CI or the completed local work. Use a separately reviewed production configuration for a later production release.
7. Run the full authenticated browser checklist on the actual origin: direct URLs/reloads, API/WS routing, two-account permissions, builds/equipment, every room action, five-wave completion, one-time claims, defeat/restart, historical replay, visual fallbacks, and desktop performance. Test real Durable Object restart/reconnect plus workflow failure/retry and alarm recovery. Record errors, identifiers, timings, and screenshots against the candidate.
8. Resume traffic only after the staging checks pass. A production release repeats identity, backup, preflight, drain, migration/deployment, and production smoke checks under explicit authorization.

## Rollback and recovery

Rollback triggers include failed smoke tests, missing/failing completion delivery, duplicated rewards/progression, incompatible snapshots, or sustained server errors. Pause starts and completion workers, drain or explicitly reconcile pending attempts, and disconnect clients before switching binaries. Restore the previous artifact only after verifying that it can read the current schema, snapshot versions, and journal formats. Otherwise restore the verified backup into a replacement database and switch the complete application/database target together; document any post-backup writes that require reconciliation. Do not delete live rows to force an old binary to start.

The candidate clears persisted Clerk secrets from Durable Object storage. The old Durable Object binary expects that saved key. **Existing warm sockets are not rollback-safe:** a rollback requires the drained cutover and a client reconnect through the old server's authenticated setup, which initializes its expected state. Do not claim a warm Worker-version rollback alone restores active sessions.

Keep the original backup, previous artifact, migration history, raw test logs, and target checklist until the release is accepted. Test replacement-database restoration and client reconnection on staging before calling this runbook production-qualified.

## Remaining release blockers

Real staging target identities/credentials and an authorized deployment are missing. Therefore Cloudflare recovery/scheduling, hosted authenticated browser checks, target-version database qualification, provider backup/PITR, the maintenance/drain mechanism, and rollback/reconnect execution remain incomplete. Local proof and a successful dry-run are evidence for preparation, not a production launch.
