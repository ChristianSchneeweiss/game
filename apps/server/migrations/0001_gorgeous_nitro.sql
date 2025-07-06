CREATE TABLE "dungeon_data" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"cleared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dungeon_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"dungeon_id" text NOT NULL,
	"player_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dungeon_participant" ADD CONSTRAINT "dungeon_participant_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dungeon_participant" ADD CONSTRAINT "dungeon_participant_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;