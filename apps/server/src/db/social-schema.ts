import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";
import { id, TB_user } from "./schema";
import { TB_preparation } from "./shared-preparation-schema";

const friendCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 12);

export const TB_friendCode = pgTable("friend_code", {
  userId: text("user_id")
    .primaryKey()
    .references(() => TB_user.id),
  code: text("code").notNull().unique().$defaultFn(friendCode),
});

export const TB_friendRequest = pgTable(
  "friend_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => id()),
    senderId: text("sender_id")
      .notNull()
      .references(() => TB_user.id),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => TB_user.id),
    status: text("status")
      .$type<"pending" | "accepted" | "declined" | "cancelled">()
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "friend_request_distinct_accounts",
      sql`${table.senderId} <> ${table.recipientId}`,
    ),
    uniqueIndex("friend_request_pending_pair")
      .on(
        sql`least(${table.senderId}, ${table.recipientId})`,
        sql`greatest(${table.senderId}, ${table.recipientId})`,
      )
      .where(sql`${table.status} = 'pending'`),
    index("friend_request_recipient").on(table.recipientId),
  ],
);

export const TB_friendship = pgTable(
  "friendship",
  {
    userA: text("user_a")
      .notNull()
      .references(() => TB_user.id),
    userB: text("user_b")
      .notNull()
      .references(() => TB_user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userA, table.userB] }),
    check(
      "friendship_ordered_accounts",
      sql`${table.userA} collate "C" < ${table.userB} collate "C"`,
    ),
    index("friendship_user_b").on(table.userB),
  ],
);

export const TB_playerBlock = pgTable(
  "player_block",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => TB_user.id),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => TB_user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    check(
      "player_block_distinct_accounts",
      sql`${table.blockerId} <> ${table.blockedId}`,
    ),
  ],
);

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired"
  | "unavailable";

export const TB_dungeonInvitation = pgTable(
  "dungeon_invitation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => id()),
    lobbyId: text("lobby_id")
      .notNull()
      .references(() => TB_preparation.id),
    senderId: text("sender_id")
      .notNull()
      .references(() => TB_user.id),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => TB_user.id),
    status: text("status")
      .$type<InvitationStatus>()
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "dungeon_invitation_distinct_accounts",
      sql`${table.senderId} <> ${table.recipientId}`,
    ),
    uniqueIndex("dungeon_invitation_pending_recipient")
      .on(table.lobbyId, table.recipientId)
      .where(sql`${table.status} = 'pending'`),
    index("dungeon_invitation_recipient").on(table.recipientId),
    index("dungeon_invitation_sender").on(table.senderId),
  ],
);
