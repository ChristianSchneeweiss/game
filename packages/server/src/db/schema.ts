import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const TB_user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
