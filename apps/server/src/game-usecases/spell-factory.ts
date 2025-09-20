import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import { TB_spellStats, type Database } from "../db/schema";

export const createSpell = async (
  userId: string,
  type: SpellType,
  db: Database
) => {
  await db.insert(TB_spellStats).values({
    userId,
    type,
  });
};

export const createSpellInTransaction = async (
  userId: string,
  type: SpellType,
  tx: Database
) => {
  await tx.insert(TB_spellStats).values({
    userId,
    type,
  });
};
