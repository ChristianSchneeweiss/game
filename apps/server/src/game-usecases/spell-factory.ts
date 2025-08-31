import type { PgTransaction } from "drizzle-orm/pg-core";
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

export const createSpellInTransaction = async (
  userId: string,
  type: string,
  tx: PgTransaction<any, any, any>
) => {
  await tx.insert(TB_spellStats).values({
    userId,
    type,
  });
};
