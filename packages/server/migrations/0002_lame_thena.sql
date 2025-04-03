CREATE TABLE "dungeon_enemy" (
	"id" text PRIMARY KEY NOT NULL,
	"dungeon_id" text NOT NULL,
	"enemy_key" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dungeon_enemy" ADD CONSTRAINT "dungeon_enemy_dungeon_id_dungeon_data_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeon_data"("id") ON DELETE no action ON UPDATE no action;