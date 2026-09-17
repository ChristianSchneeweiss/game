BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE character
  ADD COLUMN ai_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN ai_prompt text NOT NULL DEFAULT '',
  ADD COLUMN ai_allow_consumables boolean NOT NULL DEFAULT true;
COMMIT;
