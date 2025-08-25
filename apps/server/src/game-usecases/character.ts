import type { Character } from "@loot-game/game/base-entity";
import type { EntityAttributes } from "@loot-game/game/types";
import {
  statPointsReceived,
  xpNeededForLevelUp,
} from "@loot-game/game/xp-curve";
import { eq } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TB_character, TB_spellStats } from "../db/schema";

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

    // todo check if we own the spell

    await tx
      .update(TB_spellStats)
      .set({ equippedBy: characterId })
      .where(eq(TB_spellStats.id, spellId));
  });
};

export const unequipSpell = async (spellId: string, db: PostgresJsDatabase) => {
  await db
    .update(TB_spellStats)
    .set({ equippedBy: null })
    .where(eq(TB_spellStats.id, spellId));
};

export const applyStatIncrease = async (
  characterId: string,
  stats: (keyof EntityAttributes)[],
  db: PostgresJsDatabase
) => {
  await db.transaction(async (tx) => {
    const [character] = await tx
      .select()
      .from(TB_character)
      .where(eq(TB_character.id, characterId));

    if (!character) throw new Error("Character not found");

    const newStatPointsAvailable = character.statPointsAvailable - stats.length;
    if (newStatPointsAvailable < 0) throw new Error("Not enough stat points");

    const vitality = stats.filter((stat) => stat === "vitality").length;
    const intelligence = stats.filter((stat) => stat === "intelligence").length;
    const agility = stats.filter((stat) => stat === "agility").length;
    const strength = stats.filter((stat) => stat === "strength").length;

    const newVitality = character.vitality + vitality;
    const newIntelligence = character.intelligence + intelligence;
    const newAgility = character.agility + agility;
    const newStrength = character.strength + strength;

    await tx
      .update(TB_character)
      .set({
        statPointsAvailable: newStatPointsAvailable,
        vitality: newVitality,
        intelligence: newIntelligence,
        agility: newAgility,
        strength: newStrength,
        mana: newIntelligence * 5,
        health: newVitality * 10,
      })
      .where(eq(TB_character.id, characterId));
  });
};

export const handleXpReceived = async (
  characterId: string,
  totalXp: number,
  tx: PgTransaction<any, any, any>
) => {
  const [character] = await tx
    .select()
    .from(TB_character)
    .where(eq(TB_character.id, characterId));
  if (!character) throw new Error("Character not found");

  const newXp = character.xp + totalXp;
  const xpNeeded = xpNeededForLevelUp(character.level);
  if (newXp >= xpNeeded) {
    const newLevel = character.level + 1;
    const newStatPointsAvailable = statPointsReceived(newLevel);

    await tx
      .update(TB_character)
      .set({
        level: newLevel,
        xp: newXp - xpNeeded,
        statPointsAvailable:
          character.statPointsAvailable + newStatPointsAvailable,
      })
      .where(eq(TB_character.id, character.id));
  } else {
    await tx
      .update(TB_character)
      .set({
        xp: newXp,
      })
      .where(eq(TB_character.id, character.id));
  }
};
