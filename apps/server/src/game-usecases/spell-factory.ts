import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TB_spellStats } from "../db/schema";

export const createSpell = async (
  userId: string,
  type: string,
  db: PostgresJsDatabase
) => {
  await db.insert(TB_spellStats).values({
    userId,
    type,
  });
};
