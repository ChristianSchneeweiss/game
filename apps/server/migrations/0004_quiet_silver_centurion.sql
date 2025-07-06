CREATE TABLE "timeline" (
	"battle_id" text NOT NULL,
	"in_battle_index" integer NOT NULL,
	"round" integer NOT NULL,
	"event_type" text NOT NULL,
	"data" json NOT NULL
);
