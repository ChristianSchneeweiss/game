import type { EntityAttributes } from "@loot-game/game/entity-types";
import { itemFactory } from "@loot-game/game/items/equipment/item-factory";
import {
  statPointsReceived,
  xpNeededForLevelUp,
} from "@loot-game/game/utils/xp-curve";
import { eq } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  TB_character,
  TB_equipmentStats,
  TB_passivSkillStats,
  TB_spellStats,
  type Database,
} from "../db/schema";
import { EntityFactory } from "./entity-factory";

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

export const renameCharacter = async (
  userId: string,
  characterId: string,
  name: string,
  db: PostgresJsDatabase
) => {
  await db.transaction(async (tx) => {
    const [character] = await tx
      .select()
      .from(TB_character)
      .where(eq(TB_character.id, characterId));

    if (!character) throw new Error("Character not found");
    if (character.userId !== userId) throw new Error("Not your character");

    await tx
      .update(TB_character)
      .set({ name })
      .where(eq(TB_character.id, characterId));
  });
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
    const equippedSpells = await tx
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.equippedBy, characterId));
    if (equippedSpells.length >= 4)
      throw new Error("Already equipped 4 spells");

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

export const equipPassiveSkill = async (
  characterId: string,
  passiveSkillId: string,
  userId: string,
  db: Database
) => {
  await db.transaction(async (tx) => {
    const [passiveSkill] = await tx
      .select()
      .from(TB_passivSkillStats)
      .where(eq(TB_passivSkillStats.id, passiveSkillId));

    if (!passiveSkill) throw new Error("Passive skill not found");
    if (passiveSkill.userId !== userId)
      throw new Error("Not your passive skill");

    await tx
      .update(TB_passivSkillStats)
      .set({ equippedBy: characterId })
      .where(eq(TB_passivSkillStats.id, passiveSkillId));
  });
};

export const unequipPassiveSkill = async (
  passiveSkillId: string,
  userId: string,
  db: Database
) => {
  await db.transaction(async (tx) => {
    const [passiveSkill] = await tx
      .select()
      .from(TB_passivSkillStats)
      .where(eq(TB_passivSkillStats.id, passiveSkillId));

    if (!passiveSkill) throw new Error("Passive skill not found");
    if (passiveSkill.userId !== userId)
      throw new Error("Not your passive skill");

    await tx
      .update(TB_passivSkillStats)
      .set({ equippedBy: null })
      .where(eq(TB_passivSkillStats.id, passiveSkillId));
  });
};

export const equipEquipment = async (
  characterId: string,
  equipmentId: string,
  userId: string,
  db: Database
) => {
  await db.transaction(async (tx) => {
    const character = await EntityFactory.createCharacter(characterId, tx);
    if (character.userId !== userId) throw new Error("Not your character");

    const [equipment] = await tx
      .select()
      .from(TB_equipmentStats)
      .where(eq(TB_equipmentStats.id, equipmentId));

    if (!equipment) throw new Error("Equipment not found");
    if (equipment.userId !== userId) throw new Error("Not your equipment");
    const equipmentItem = itemFactory(equipment.type, equipmentId, character);

    const currentItemAtSlot = character.equipped[equipmentItem.equipmentSlot];
    if (currentItemAtSlot) {
      await tx
        .update(TB_equipmentStats)
        .set({ equippedBy: null })
        .where(eq(TB_equipmentStats.id, currentItemAtSlot.id));
    }

    await tx
      .update(TB_equipmentStats)
      .set({ equippedBy: characterId })
      .where(eq(TB_equipmentStats.id, equipmentId));
  });
};

export const unequipEquipment = async (
  equipmentId: string,
  userId: string,
  db: Database
) => {
  await db.transaction(async (tx) => {
    const [equipment] = await tx
      .select()
      .from(TB_equipmentStats)
      .where(eq(TB_equipmentStats.id, equipmentId));

    if (!equipment) throw new Error("Equipment not found");
    if (equipment.userId !== userId) throw new Error("Not your equipment");

    await tx
      .update(TB_equipmentStats)
      .set({ equippedBy: null })
      .where(eq(TB_equipmentStats.id, equipmentId));
  });
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
