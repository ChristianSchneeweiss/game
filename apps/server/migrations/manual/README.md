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
