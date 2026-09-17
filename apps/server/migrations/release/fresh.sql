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
	"supplies_returned_at" timestamp with time zone,
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
	"build_revision" integer DEFAULT 0 NOT NULL,
	"ai_enabled" boolean DEFAULT false NOT NULL,
	"ai_prompt" text DEFAULT '' NOT NULL,
	"ai_allow_consumables" boolean DEFAULT true NOT NULL,
	"consumable_loadout" json DEFAULT '[null,null]'::json NOT NULL,
	"stat_points_available" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "consumable_use" (
	"user_id" text NOT NULL,
	"request_id" text NOT NULL,
	"dungeon_id" text NOT NULL,
	"character_id" text NOT NULL,
	"item_type" text NOT NULL,
	"restored" double precision NOT NULL,
	CONSTRAINT "consumable_use_user_id_request_id_pk" PRIMARY KEY("user_id","request_id")
);

CREATE TABLE "dungeon_battle" (
	"id" text PRIMARY KEY NOT NULL,
	"dungeon_id" text NOT NULL,
	"battle_id" text NOT NULL,
	"round" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
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
	"abandoned_at" timestamp with time zone,
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

CREATE TABLE "dungeon_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"lobby_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "dungeon_invitation_distinct_accounts" CHECK ("dungeon_invitation"."sender_id" <> "dungeon_invitation"."recipient_id")
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

CREATE TABLE "friend_code" (
	"user_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "friend_code_code_unique" UNIQUE("code")
);

CREATE TABLE "friend_request" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_request_distinct_accounts" CHECK ("friend_request"."sender_id" <> "friend_request"."recipient_id")
);

CREATE TABLE "friendship" (
	"user_a" text NOT NULL,
	"user_b" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendship_user_a_user_b_pk" PRIMARY KEY("user_a","user_b"),
	CONSTRAINT "friendship_ordered_accounts" CHECK ("friendship"."user_a" collate "C" < "friendship"."user_b" collate "C")
);

CREATE TABLE "item_stack" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "item_stack_user_id_type_pk" PRIMARY KEY("user_id","type"),
	CONSTRAINT "item_stack_positive_quantity" CHECK ("item_stack"."quantity" > 0)
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

CREATE TABLE "player_block" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_block_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "player_block_distinct_accounts" CHECK ("player_block"."blocker_id" <> "player_block"."blocked_id")
);

CREATE TABLE "preparation" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"branching" boolean DEFAULT true NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"host_user_id" text NOT NULL,
	"guest_user_id" text,
	"host_character_id" text,
	"guest_character_id" text,
	"host_ready_revision" integer,
	"guest_ready_revision" integer,
	"dungeon_id" text,
	"replay_of_dungeon_id" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preparation_dungeon_id_unique" UNIQUE("dungeon_id"),
	CONSTRAINT "preparation_replay_of_dungeon_id_unique" UNIQUE("replay_of_dungeon_id")
);

CREATE TABLE "preparation_connection" (
	"connection_id" text PRIMARY KEY NOT NULL,
	"preparation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "preparation_connection_identity" UNIQUE("preparation_id","connection_id")
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
ALTER TABLE "consumable_use" ADD CONSTRAINT "consumable_use_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_battle" ADD CONSTRAINT "dungeon_battle_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_data" ADD CONSTRAINT "dungeon_data_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_enemy" ADD CONSTRAINT "dungeon_enemy_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_invitation" ADD CONSTRAINT "dungeon_invitation_lobby_id_preparation_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."preparation"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_invitation" ADD CONSTRAINT "dungeon_invitation_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_invitation" ADD CONSTRAINT "dungeon_invitation_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_participant" ADD CONSTRAINT "dungeon_participant_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_participant" ADD CONSTRAINT "dungeon_participant_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "equipment_stats" ADD CONSTRAINT "equipment_stats_equipped_by_character_id_fk" FOREIGN KEY ("equipped_by") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "equipment_stats" ADD CONSTRAINT "equipment_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friend_code" ADD CONSTRAINT "friend_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_a_user_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_b_user_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "item_stack" ADD CONSTRAINT "item_stack_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "loot" ADD CONSTRAINT "loot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "passive_skill_stats" ADD CONSTRAINT "passive_skill_stats_equipped_by_character_id_fk" FOREIGN KEY ("equipped_by") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "passive_skill_stats" ADD CONSTRAINT "passive_skill_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_block" ADD CONSTRAINT "player_block_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_block" ADD CONSTRAINT "player_block_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "preparation" ADD CONSTRAINT "preparation_host_user_id_user_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "preparation" ADD CONSTRAINT "preparation_guest_user_id_user_id_fk" FOREIGN KEY ("guest_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "preparation" ADD CONSTRAINT "preparation_host_character_id_character_id_fk" FOREIGN KEY ("host_character_id") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "preparation" ADD CONSTRAINT "preparation_guest_character_id_character_id_fk" FOREIGN KEY ("guest_character_id") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "preparation" ADD CONSTRAINT "preparation_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "preparation" ADD CONSTRAINT "preparation_replay_of_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("replay_of_dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "preparation_connection" ADD CONSTRAINT "preparation_connection_preparation_id_preparation_id_fk" FOREIGN KEY ("preparation_id") REFERENCES "public"."preparation"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "preparation_connection" ADD CONSTRAINT "preparation_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "spell_stats" ADD CONSTRAINT "spell_stats_equipped_by_character_id_fk" FOREIGN KEY ("equipped_by") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "spell_stats" ADD CONSTRAINT "spell_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "dungeon_invitation_pending_recipient" ON "dungeon_invitation" USING btree ("lobby_id","recipient_id") WHERE "dungeon_invitation"."status" = 'pending';
CREATE INDEX "dungeon_invitation_recipient" ON "dungeon_invitation" USING btree ("recipient_id");
CREATE INDEX "dungeon_invitation_sender" ON "dungeon_invitation" USING btree ("sender_id");
CREATE UNIQUE INDEX "friend_request_pending_pair" ON "friend_request" USING btree (least("sender_id", "recipient_id"),greatest("sender_id", "recipient_id")) WHERE "friend_request"."status" = 'pending';
CREATE INDEX "friend_request_recipient" ON "friend_request" USING btree ("recipient_id");
CREATE INDEX "friendship_user_b" ON "friendship" USING btree ("user_b");
CREATE INDEX "preparation_host_user" ON "preparation" USING btree ("host_user_id");
CREATE INDEX "preparation_guest_user" ON "preparation" USING btree ("guest_user_id");
COMMIT;
