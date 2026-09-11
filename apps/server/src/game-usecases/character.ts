import type { EntityAttributes } from "@loot-game/game/entity-types";
import { itemFactory } from "@loot-game/game/items/equipment/item-factory";
import {
  statPointsReceived,
  xpNeededForLevelUp,
} from "@loot-game/game/utils/xp-curve";
import { TRPCError } from "@trpc/server";
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
import { lockCharacters } from "./character-locks";

export const createCharacter = async (
  name: string,
  userId: string,
  db: PostgresJsDatabase,
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
  db: PostgresJsDatabase,
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
  userId: string,
  db: Database,
) => {
  await db.transaction(async (tx) => {
    const [character] = await tx
      .select()
      .from(TB_character)
      .where(eq(TB_character.id, characterId))
      .for("update");

    if (!character) throw new Error("Character not found");
    if (character.userId !== userId) throw new Error("Not your character");

    const [spell] = await tx
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.id, spellId))
      .for("update");
    if (!spell || spell.userId !== userId)
      throw new Error("Spell not found in your collection");
    if (spell.equippedBy === characterId) return;
    if (spell.equippedBy)
      throw new Error("Unequip this spell from its current character first");

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

export const unequipSpell = async (
  spellId: string,
  userId: string,
  db: Database,
) => {
  await unequipOwnedItem("Spell", TB_spellStats, spellId, userId, db);
};

export const equipPassiveSkill = async (
  characterId: string,
  passiveSkillId: string,
  userId: string,
  db: Database,
) => {
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(TB_passivSkillStats)
      .where(eq(TB_passivSkillStats.id, passiveSkillId));
    if (!before) throw new Error("Passive skill not found");
    if (before.userId !== userId) throw new Error("Not your passive skill");
    // Passive transfers are supported; freeze both old and new builds in the
    // same global character order used by dungeon attempt capture.
    const characterIds = [characterId, before.equippedBy].filter(
      (id): id is string => id !== null,
    );
    const characters = await lockCharacters(characterIds, tx);
    if (
      !characters.some(
        (character) =>
          character.id === characterId && character.userId === userId,
      )
    )
      throw new Error("Not your character");
    const [passiveSkill] = await tx
      .select()
      .from(TB_passivSkillStats)
      .where(eq(TB_passivSkillStats.id, passiveSkillId))
      .for("update");
    if (!passiveSkill || passiveSkill.equippedBy !== before.equippedBy)
      throw new TRPCError({
        code: "CONFLICT",
        message: "The item assignment changed. Try again.",
      });
    await tx
      .update(TB_passivSkillStats)
      .set({ equippedBy: characterId })
      .where(eq(TB_passivSkillStats.id, passiveSkillId));
  });
};

export const unequipPassiveSkill = async (
  passiveSkillId: string,
  userId: string,
  db: Database,
) => {
  await unequipOwnedItem(
    "Passive skill",
    TB_passivSkillStats,
    passiveSkillId,
    userId,
    db,
  );
};

export const equipEquipment = async (
  characterId: string,
  equipmentId: string,
  userId: string,
  db: Database,
) => {
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select()
      .from(TB_character)
      .where(eq(TB_character.id, characterId))
      .for("update");
    if (!owner || owner.userId !== userId)
      throw new Error("Not your character");
    const character = await EntityFactory.createCharacter(characterId, tx);

    const [equipment] = await tx
      .select()
      .from(TB_equipmentStats)
      .where(eq(TB_equipmentStats.id, equipmentId))
      .for("update");

    if (!equipment) throw new Error("Equipment not found");
    if (equipment.userId !== userId) throw new Error("Not your equipment");
    if (equipment.equippedBy === characterId) return;
    if (equipment.equippedBy)
      throw new Error("Unequip this item from its current character first");
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
  db: Database,
) => {
  await unequipOwnedItem(
    "Equipment",
    TB_equipmentStats,
    equipmentId,
    userId,
    db,
  );
};

/** Match snapshot/equip lock order: character first, then its assigned item. */
async function unequipOwnedItem(
  label: "Spell" | "Passive skill" | "Equipment",
  table:
    | typeof TB_spellStats
    | typeof TB_passivSkillStats
    | typeof TB_equipmentStats,
  itemId: string,
  userId: string,
  db: Database,
) {
  await db.transaction(async (tx) => {
    const columns = { userId: table.userId, equippedBy: table.equippedBy };
    const [before] = await tx
      .select(columns)
      .from(table)
      .where(eq(table.id, itemId));
    if (!before || before.userId !== userId) {
      // This endpoint has always treated unowned/missing spell IDs as no-ops.
      if (label === "Spell") return;
      throw new Error(
        !before ? `${label} not found` : `Not your ${label.toLowerCase()}`,
      );
    }
    if (before.equippedBy) {
      await tx
        .select({ id: TB_character.id })
        .from(TB_character)
        .where(eq(TB_character.id, before.equippedBy))
        .for("update");
    }
    const [item] = await tx
      .select(columns)
      .from(table)
      .where(eq(table.id, itemId))
      .for("update");
    if (
      !item ||
      item.userId !== userId ||
      item.equippedBy !== before.equippedBy
    )
      throw new TRPCError({
        code: "CONFLICT",
        message: "The item assignment changed. Try again.",
      });
    await tx
      .update(table)
      .set({ equippedBy: null })
      .where(eq(table.id, itemId));
  });
}

export const applyStatIncrease = async (
  characterId: string,
  stats: (keyof EntityAttributes)[],
  userId: string,
  db: Database,
) => {
  await db.transaction(async (tx) => {
    const [character] = await tx
      .select()
      .from(TB_character)
      .where(eq(TB_character.id, characterId))
      .for("update");

    if (!character) throw new Error("Character not found");
    if (character.userId !== userId) throw new Error("Not your character");

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
  tx: PgTransaction<any, any, any>,
) => {
  const [character] = await tx
    .select()
    .from(TB_character)
    .where(eq(TB_character.id, characterId))
    .for("update");
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
