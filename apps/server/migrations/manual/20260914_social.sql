-- Persistent account relationships and addressed, expiring dungeon invitations.
-- Apply after 20260914_shared_preparation.sql.
BEGIN;
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

CREATE TABLE "player_block" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_block_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "player_block_distinct_accounts" CHECK ("player_block"."blocker_id" <> "player_block"."blocked_id")
);

ALTER TABLE "dungeon_invitation" ADD CONSTRAINT "dungeon_invitation_lobby_id_preparation_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."preparation"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_invitation" ADD CONSTRAINT "dungeon_invitation_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dungeon_invitation" ADD CONSTRAINT "dungeon_invitation_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friend_code" ADD CONSTRAINT "friend_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_a_user_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_b_user_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_block" ADD CONSTRAINT "player_block_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_block" ADD CONSTRAINT "player_block_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "dungeon_invitation_pending_recipient" ON "dungeon_invitation" USING btree ("lobby_id","recipient_id") WHERE "dungeon_invitation"."status" = 'pending';
CREATE INDEX "dungeon_invitation_recipient" ON "dungeon_invitation" USING btree ("recipient_id");
CREATE INDEX "dungeon_invitation_sender" ON "dungeon_invitation" USING btree ("sender_id");
CREATE UNIQUE INDEX "friend_request_pending_pair" ON "friend_request" USING btree (least("sender_id", "recipient_id"),greatest("sender_id", "recipient_id")) WHERE "friend_request"."status" = 'pending';
CREATE INDEX "friend_request_recipient" ON "friend_request" USING btree ("recipient_id");
CREATE INDEX "friendship_user_b" ON "friendship" USING btree ("user_b");
COMMIT;
