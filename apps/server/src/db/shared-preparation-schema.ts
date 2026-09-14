import {
  boolean,
  integer,
  index,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { id, TB_character, TB_dungeonData, TB_user } from "./schema";

/** One planned run, retained as its encounter-consent record after entry. */
export const TB_preparation = pgTable(
  "preparation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => id()),
    key: text("key").notNull(),
    branching: boolean("branching").notNull().default(true),
    revision: integer("revision").notNull().default(0),
    hostUserId: text("host_user_id")
      .notNull()
      .references(() => TB_user.id),
    guestUserId: text("guest_user_id").references(() => TB_user.id),
    hostCharacterId: text("host_character_id").references(
      () => TB_character.id,
    ),
    guestCharacterId: text("guest_character_id").references(
      () => TB_character.id,
    ),
    hostReadyRevision: integer("host_ready_revision"),
    guestReadyRevision: integer("guest_ready_revision"),
    dungeonId: text("dungeon_id")
      .unique()
      .references(() => TB_dungeonData.id),
    replayOfDungeonId: text("replay_of_dungeon_id")
      .unique()
      .references(() => TB_dungeonData.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("preparation_host_user").on(table.hostUserId),
    index("preparation_guest_user").on(table.guestUserId),
  ],
);

/** Connections are scoped to a preparation/run, never account-global presence. */
export const TB_preparationConnection = pgTable(
  "preparation_connection",
  {
    connectionId: text("connection_id").primaryKey(),
    preparationId: text("preparation_id")
      .notNull()
      .references(() => TB_preparation.id),
    userId: text("user_id")
      .notNull()
      .references(() => TB_user.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("preparation_connection_identity").on(
      table.preparationId,
      table.connectionId,
    ),
  ],
);
