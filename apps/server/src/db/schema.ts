import type { EventTypes } from "@loot-game/game/timeline-events";
import {
  boolean,
  integer,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";
import { COL_characterDungeonData } from "./character-dungeon-data";

export const id = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

export const TB_user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const TB_team = pgTable("team", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  name: text("name").notNull(),
  characters: text("characters").array(),
});

export const TB_character = pgTable("character", {
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

  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  statPointsAvailable: integer("stat_points_available").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const TB_actionSelectionHook = pgTable("action_selection_hook", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  characterId: text("character_id")
    .notNull()
    .references(() => TB_character.id),
  name: text("name").notNull(),
  priority: integer("priority").notNull(),
  data: json("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type TB_actionSelectionHook = typeof TB_actionSelectionHook.$inferSelect;

export const TB_spellStats = pgTable("spell_stats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  type: text("type").notNull(),
  equippedBy: text("equipped_by").references(() => TB_character.id),
  userId: text("user_id")
    .notNull()
    .references(() => TB_user.id),
});

export const TB_dungeonData = pgTable("dungeon_data", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  key: text("key").notNull(),
  round: integer("round").notNull().default(0),
  cleared: boolean("cleared").notNull().default(false),
  characterData: COL_characterDungeonData("character_data")
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const TB_dungeonParticipant = pgTable("dungeon_participant", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  dungeonId: text("dungeon_id")
    .notNull()
    .references(() => TB_dungeonData.id),
  characterId: text("character_id")
    .notNull()
    .references(() => TB_character.id),
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

export const TB_dungeonBattle = pgTable("dungeon_battle", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  dungeonId: text("dungeon_id")
    .notNull()
    .references(() => TB_dungeonData.id),
  battleId: text("battle_id").notNull(),
  round: integer("round").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
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
