-- Add per-run consent and terminal abandonment without reserving characters.
BEGIN;
ALTER TABLE "character" ADD COLUMN IF NOT EXISTS "build_revision" integer NOT NULL DEFAULT 0;
ALTER TABLE "dungeon_data" ADD COLUMN IF NOT EXISTS "abandoned_at" timestamp with time zone;
ALTER TABLE "dungeon_battle" ADD COLUMN IF NOT EXISTS "abandoned_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "preparation" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL,
  "branching" boolean NOT NULL DEFAULT true,
  "revision" integer NOT NULL DEFAULT 0,
  "host_user_id" text NOT NULL REFERENCES "user"("id"),
  "guest_user_id" text REFERENCES "user"("id"),
  "host_character_id" text REFERENCES "character"("id"),
  "guest_character_id" text REFERENCES "character"("id"),
  "host_ready_revision" integer,
  "guest_ready_revision" integer,
  "dungeon_id" text UNIQUE REFERENCES "dungeon_data"("id"),
  "replay_of_dungeon_id" text UNIQUE REFERENCES "dungeon_data"("id"),
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "preparation_host_user" ON "preparation" ("host_user_id");
CREATE INDEX IF NOT EXISTS "preparation_guest_user" ON "preparation" ("guest_user_id");

CREATE TABLE IF NOT EXISTS "preparation_connection" (
  "connection_id" text PRIMARY KEY,
  "preparation_id" text NOT NULL REFERENCES "preparation"("id"),
  "user_id" text NOT NULL REFERENCES "user"("id"),
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "preparation_connection_identity" UNIQUE ("preparation_id", "connection_id")
);
COMMIT;
