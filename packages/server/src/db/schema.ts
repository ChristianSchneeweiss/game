import type { EventData, EventTypes } from "@loot-game/game/types";
import {
  boolean,
  integer,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";
import SuperJSON from "superjson";

export const id = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

export const TB_user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const TB_player = pgTable("player", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  userId: text("user_id")
    .notNull()
    .references(() => TB_user.id),

  name: text("name").notNull(),
  health: integer("health").notNull(),

  mana: integer("mana").notNull(),
  intelligence: integer("intelligence").notNull(),
  vitality: integer("vitality").notNull(),
  agility: integer("agility").notNull(),
  strength: integer("strength").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const TB_spellStats = pgTable("spell_stats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  type: text("type").notNull(),
  playerId: text("player_id")
    .notNull()
    .references(() => TB_player.id),
});

export const TB_dungeonData = pgTable("dungeon_data", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  key: text("key").notNull(),
  round: integer("round").notNull().default(0),
  cleared: boolean("cleared").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const TB_dungeonParticipant = pgTable("dungeon_participant", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  dungeonId: text("dungeon_id")
    .notNull()
    .references(() => TB_dungeonData.id),
  playerId: text("player_id")
    .notNull()
    .references(() => TB_player.id),
});

export const TB_dungeonEnemy = pgTable("dungeon_enemy", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  dungeonId: text("dungeon_id")
    .notNull()
    .references(() => TB_dungeonData.id),
  enemyKey: text("enemy_key").notNull(),
  inRound: integer("in_round").notNull(),
});

export const TB_timeline = pgTable("timeline", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id(24)),
  battleId: text("battle_id").notNull(),
  inBattleIndex: integer("in_battle_index").notNull(),
  round: integer("round").notNull(),
  eventType: text("event_type").$type<EventTypes>().notNull(),
  data: json("data").notNull(), // superjson event data
});
