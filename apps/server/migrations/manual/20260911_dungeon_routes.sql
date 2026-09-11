BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE dungeon_data ADD COLUMN IF NOT EXISTS route json;
COMMIT;
