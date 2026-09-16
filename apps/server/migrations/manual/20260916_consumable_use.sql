BEGIN;
ALTER TABLE character ADD COLUMN consumable_loadout json NOT NULL DEFAULT '[null,null]'::json;
ALTER TABLE battle_start ADD COLUMN supplies_returned_at timestamptz;
CREATE TABLE consumable_use (
  user_id text NOT NULL REFERENCES "user"(id),
  request_id text NOT NULL,
  dungeon_id text NOT NULL,
  character_id text NOT NULL,
  item_type text NOT NULL,
  restored double precision NOT NULL,
  PRIMARY KEY (user_id, request_id)
);
COMMIT;
