import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";

const id = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

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
