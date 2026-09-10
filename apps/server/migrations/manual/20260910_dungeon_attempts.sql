-- Apply to the schema deployed at 3835a60, with ON_ERROR_STOP enabled.
-- The old generated migration chain does not describe that deployed schema.
BEGIN;
LOCK TABLE dungeon_data, dungeon_battle, loot IN ACCESS EXCLUSIVE MODE;

-- Ambiguous legacy state must be inspected, never silently deduplicated or
-- mistaken for an unprocessed completion. Finish active battles before rollout.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM dungeon_data WHERE active_battle) THEN
    RAISE EXCEPTION 'Finish active dungeon attempts before this migration';
  END IF;
  IF EXISTS (SELECT battle_id FROM dungeon_battle GROUP BY battle_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate dungeon battle IDs require reconciliation';
  END IF;
  IF EXISTS (SELECT battle_id, user_id FROM loot GROUP BY battle_id, user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate battle rewards require reconciliation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM dungeon_battle b LEFT JOIN battle_result r USING (battle_id)
    WHERE r.battle_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Legacy attempts without a saved result require reconciliation';
  END IF;
END $$;

ALTER TABLE dungeon_data ADD COLUMN active_battle_id text;
ALTER TABLE dungeon_battle ADD COLUMN completed_at timestamptz;
-- With active and missing-result attempts excluded, these are historical
-- completions. Their marker prevents delayed workflow delivery granting twice.
UPDATE dungeon_battle SET completed_at = CURRENT_TIMESTAMP;
ALTER TABLE dungeon_battle ADD CONSTRAINT dungeon_battle_battle_id_unique UNIQUE (battle_id);
ALTER TABLE loot ADD CONSTRAINT loot_battle_user_unique UNIQUE (battle_id, user_id);
CREATE TABLE battle_start (battle_id text PRIMARY KEY, builds json NOT NULL);
COMMIT;
