-- Generated from Drizzle schema by scripts/database-schema.ts.
BEGIN;
CREATE TABLE "active_battle" (
	"id" text PRIMARY KEY NOT NULL,
	"last_action" timestamp with time zone NOT NULL
);

CREATE TABLE "battle_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"battle_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"is_bot" boolean NOT NULL,
	"enemy_type" text,
	"team" text NOT NULL
);

CREATE TABLE "battle_result" (
	"battle_id" text PRIMARY KEY NOT NULL,
	"timeline_data" json NOT NULL,
	"start_entity_data" json NOT NULL,
	"participants" json NOT NULL,
	"effect_tracking" json NOT NULL,
	"winner" text NOT NULL,
	"team_a" json NOT NULL,
	"team_b" json NOT NULL
);

CREATE TABLE "battle_start" (
	"battle_id" text PRIMARY KEY NOT NULL,
	"builds" json NOT NULL
);

CREATE TABLE "character" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"health" integer NOT NULL,
	"mana" integer NOT NULL,
	"intelligence" integer NOT NULL,
	"vitality" integer NOT NULL,
	"agility" integer NOT NULL,
	"strength" integer NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"stat_points_available" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "dungeon_battle" (
	"id" text PRIMARY KEY NOT NULL,
	"dungeon_id" text NOT NULL,
	"battle_id" text NOT NULL,
	"round" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "dungeon_battle_battle_id_unique" UNIQUE("battle_id")
);

CREATE TABLE "dungeon_data" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"cleared" boolean DEFAULT false NOT NULL,
	"active_battle" boolean DEFAULT false NOT NULL,
	"active_battle_id" text,
	"route" json,
	"created_by" text NOT NULL,
	"character_data" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "dungeon_enemy" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"dungeon_id" text NOT NULL,
	"in_round" integer NOT NULL
);

CREATE TABLE "dungeon_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"dungeon_id" text NOT NULL,
	"character_id" text NOT NULL
);

CREATE TABLE "equipment_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"equipped_by" text,
	"user_id" text NOT NULL
);

CREATE TABLE "loot" (
	"id" text PRIMARY KEY NOT NULL,
	"battle_id" text NOT NULL,
	"user_id" text NOT NULL,
	"items" json NOT NULL,
	"gold" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "loot_battle_user_unique" UNIQUE("battle_id","user_id")
);

CREATE TABLE "passive_skill_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"equipped_by" text,
	"user_id" text NOT NULL
);

CREATE TABLE "spell_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"equipped_by" text,
	"user_id" text NOT NULL
);

CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"characters" text[]
);

CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);

ALTER TABLE "character" ADD CONSTRAINT "character_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_battle" ADD CONSTRAINT "dungeon_battle_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_data" ADD CONSTRAINT "dungeon_data_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_enemy" ADD CONSTRAINT "dungeon_enemy_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_participant" ADD CONSTRAINT "dungeon_participant_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_participant" ADD CONSTRAINT "dungeon_participant_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "equipment_stats" ADD CONSTRAINT "equipment_stats_equipped_by_character_id_fk" FOREIGN KEY ("equipped_by") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "equipment_stats" ADD CONSTRAINT "equipment_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "loot" ADD CONSTRAINT "loot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "passive_skill_stats" ADD CONSTRAINT "passive_skill_stats_equipped_by_character_id_fk" FOREIGN KEY ("equipped_by") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "passive_skill_stats" ADD CONSTRAINT "passive_skill_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "spell_stats" ADD CONSTRAINT "spell_stats_equipped_by_character_id_fk" FOREIGN KEY ("equipped_by") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "spell_stats" ADD CONSTRAINT "spell_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
COMMIT;
