import { inArray } from "drizzle-orm";
import { TB_character, type Database } from "../db/schema";

/** All multi-character writers use the database collation, never JS sorting. */
export async function lockCharacters(characterIds: string[], tx: Database) {
  return tx
    .select({ id: TB_character.id, userId: TB_character.userId })
    .from(TB_character)
    .where(inArray(TB_character.id, characterIds))
    .orderBy(TB_character.id)
    .for("update");
}
