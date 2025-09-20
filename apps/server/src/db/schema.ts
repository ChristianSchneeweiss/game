import { faker } from "@faker-js/faker";
import type { EnemyType } from "@loot-game/game/enemies/base/enemy-types";
import type { Team } from "@loot-game/game/entity-types";
import type { EquipmentSlot } from "@loot-game/game/items/equipment/equipment";
import type { EquipmentType } from "@loot-game/game/items/equipment/equipment-types";
import type { PassiveType } from "@loot-game/game/passive-skills/base/passive-types";
import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import type { EventTypes } from "@loot-game/game/timeline-events";
import type { LootEntity } from "@loot-game/game/types";
import {
  boolean,
  integer,
  json,
  PgDatabase,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { customAlphabet } from "nanoid";
import { COL_characterDungeonData } from "./character-dungeon-data";

export type Database = PostgresJsDatabase | PgDatabase<any, any, any>;

export const id = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

export const TB_user = pgTable("user", {
  id: text("id").primaryKey(),
  username: text("username")
    .$defaultFn(() => faker.internet.username())
    .unique()
    .notNull(),
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

export const TB_spellStats = pgTable("spell_stats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  type: text("type").$type<SpellType>().notNull(),
  equippedBy: text("equipped_by").references(() => TB_character.id),
  userId: text("user_id")
    .notNull()
    .references(() => TB_user.id),
});

export const TB_passivSkillStats = pgTable("passive_skill_stats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  type: text("type").$type<PassiveType>().notNull(),
  equippedBy: text("equipped_by").references(() => TB_character.id),
  userId: text("user_id")
    .notNull()
    .references(() => TB_user.id),
});

export const TB_equipmentStats = pgTable("equipment_stats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  type: text("type").$type<EquipmentType>().notNull(),
  slot: text("slot").$type<EquipmentSlot>().notNull(),
  equippedBy: text("equipped_by").references(() => TB_character.id),
  userId: text("user_id")
    .notNull()
    .references(() => TB_user.id),
});

export const equipmentStatsIndex = unique("equipment_stats_index").on(
  TB_equipmentStats.equippedBy,
  TB_equipmentStats.slot
);

export const TB_dungeonData = pgTable("dungeon_data", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  key: text("key").notNull(),
  round: integer("round").notNull().default(0),
  cleared: boolean("cleared").notNull().default(false),
  activeBattle: boolean("active_battle").notNull().default(false),
  createdBy: text("created_by")
    .notNull()
    .references(() => TB_user.id),
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
  type: text("type").$type<EnemyType>().notNull(),
  dungeonId: text("dungeon_id")
    .notNull()
    .references(() => TB_dungeonData.id),
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

export const TB_battleParticipants = pgTable("battle_participants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  battleId: text("battle_id").notNull(),
  entityId: text("entity_id").notNull(),
  isBot: boolean("is_bot").notNull(),
  enemyType: text("enemy_type").$type<EnemyType>(),
  team: text("team").notNull().$type<Team>(),
});

export const TB_activeBattle = pgTable("active_battle", {
  battleId: text("id").primaryKey(),
  lastAction: timestamp("last_action", { withTimezone: true })
    .notNull()
    .$onUpdateFn(() => new Date()),
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

// const lootEntityType = customType<{ data: LootEntity[]; driverData: string }>({
//   dataType: () => "json",
//   toDriver: (value) => JSON.stringify(value),
//   // in the to driver we need to stringify it. but in the from driver we get it as object already. thats weird. but its works
//   fromDriver: (value: unknown) => LootEntitySchema.array().parse(value),
// });

export const TB_loot = pgTable("loot", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => id()),
  battleId: text("battle_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => TB_user.id),
  items: json("items").$type<LootEntity[]>().notNull(),
  gold: integer("gold").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
