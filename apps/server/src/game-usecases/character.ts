import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TB_character } from "../db/schema";

export const createCharacter = async (
  name: string,
  userId: string,
  db: PostgresJsDatabase
) => {
  const character = await db.insert(TB_character).values({
    name,
    userId,
    health: 100,
    mana: 50,
    intelligence: 10,
    vitality: 10,
    agility: 10,
    strength: 10,
    equippedSpells: [],
  });
  return character;
};

export const equipSpell = async (
  characterId: string,
  spellId: string,
  db: PostgresJsDatabase
) => {
  await db.transaction(async (tx) => {
    const [character] = await tx
      .select()
      .from(TB_character)
      .where(eq(TB_character.id, characterId));

    if (!character) throw new Error("Character not found");

    // todo check if spell is already equipped and if we own it

    await tx
      .update(TB_character)
      .set({ equippedSpells: [...(character.equippedSpells || []), spellId] })
      .where(eq(TB_character.id, characterId));
  });
};
