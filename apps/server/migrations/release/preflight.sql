-- Read-only target inspection. Apply no migration until the target identity and
-- schema fingerprint match the reviewed candidate's rehearsal evidence.
SELECT current_database() AS database, current_user AS role,
       inet_server_addr() AS server, inet_server_port() AS port, version();
SELECT table_name, column_name, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, column_name;
-- These four queries must return zero rows for the audited-schema upgrade.
SELECT id FROM dungeon_data WHERE active_battle;
SELECT battle_id, count(*) FROM dungeon_battle GROUP BY battle_id HAVING count(*) > 1;
SELECT battle_id, user_id, count(*) FROM loot GROUP BY battle_id, user_id HAVING count(*) > 1;
SELECT b.battle_id FROM dungeon_battle b LEFT JOIN battle_result r USING (battle_id)
WHERE r.battle_id IS NULL;
