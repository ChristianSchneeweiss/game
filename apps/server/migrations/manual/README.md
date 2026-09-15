# Dungeon attempt migration

`20260910_dungeon_attempts.sql` upgrades the application schema at `3835a60`.
The generated migrations through `0005` predate that schema; this standalone
migration deliberately does not replay their obsolete table definitions.

Before rollout, finish active dungeon attempts and inspect the following queries
against the target database. All must return no rows:

```sql
SELECT id, active_battle FROM dungeon_data WHERE active_battle;
SELECT battle_id, count(*) FROM dungeon_battle GROUP BY battle_id HAVING count(*) > 1;
SELECT battle_id, user_id, count(*) FROM loot GROUP BY battle_id, user_id HAVING count(*) > 1;
SELECT b.* FROM dungeon_battle b LEFT JOIN battle_result r USING (battle_id)
WHERE r.battle_id IS NULL;
```

Pause starts and completion workers for the schema/application cutover. Run the
SQL with `psql --set ON_ERROR_STOP=on --file 20260910_dungeon_attempts.sql` using
the intended database connection. It locks affected tables, repeats the checks
and either commits the whole upgrade or changes nothing. Reconcile any reported
legacy records explicitly; no rewards or attempt rows are deleted by this file.

Historical attempts receive completion markers. New attempts freeze complete
builds and starting resources; old battles without snapshots retain the existing
roster fallback. Recorded results are displayed from their saved event format;
new combat rules do not reinterpret historical event summaries.

The migration has not been applied to a shared or production database.

## Branching dungeon routes

`20260911_dungeon_routes.sql` adds a nullable JSON `route` column to
`dungeon_data`. Apply it before running the branching-route application code.
The migration is transactional and uses a short lock timeout; it can be retried
if the table is busy. It does not rewrite existing run state.

Runs created through the preparation screen save their weighted offers and
choices in this column. Existing runs retain `NULL` and continue linearly.
The migration was applied to the verified local OrbStack `game` database on
11 September 2026. It has not been applied to production.

## Friends and shared preparation

Apply `20260914_shared_preparation.sql` followed by `20260914_social.sql`.
The first adds character build revisions, terminal abandonment markers, saved
preparations, and scoped connections. The second adds account codes,
relationships, blocks, and expiring invitations referencing those preparations.
Neither adds a global player or character reservation.

`scripts/production-migrate.ts upgrade` applies both through the transactional
checksum history. The generated fresh schema includes them. The PostgreSQL
rehearsal checks that upgrades and fresh installations agree and retains old
results and resources. These migrations have only been applied to disposable
test databases during issue #2 implementation. See
[implementation notes](../../../../docs/features/friends/implementation.md) for the new
Worker binding and remaining browser verification.

## Item stacks

`20260915_item_stacks.sql` adds account-owned consumable and material quantities.
Apply it before the item inventory application changes. The upgrade command
includes it, and the generated fresh schema contains the same table. Equipment
rows, IDs and equipped-character assignments are preserved. A failed migration
rolls back the table and constraints together; checksum history makes retries safe.
Only disposable databases are used for implementation verification.
