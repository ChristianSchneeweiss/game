import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import { BasicAttackSpell } from "@loot-game/game/spells/basic-attack";
import { CinderWispSpell } from "@loot-game/game/spells/cinder-wisp";
import { CrudeStrikeSpell } from "@loot-game/game/spells/crude-strike";
import { FesteringBlowSpell } from "@loot-game/game/spells/festering-blow";
import { FireballSpell } from "@loot-game/game/spells/fireball";
import { SingleHealSpell } from "@loot-game/game/spells/single-heal";
import { VitalStrikeSpell } from "@loot-game/game/spells/vital-strike";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TB_spellStats } from "../db/schema";

export const createSpell = async (
  userId: string,
  type: SpellType,
  db: PostgresJsDatabase
) => {
  await db.insert(TB_spellStats).values({
    userId,
    type,
  });
};

export const createSpellInTransaction = async (
  userId: string,
  type: SpellType,
  tx: PgTransaction<any, any, any>
) => {
  await tx.insert(TB_spellStats).values({
    userId,
    type,
  });
};

export const createSpellFromType = (id: string, type: SpellType) => {
  switch (type) {
    case "fireball":
      return new FireballSpell(id);
    case "single-heal":
      return new SingleHealSpell(id);
    case "crude-strike":
      return new CrudeStrikeSpell(id);
    case "festering-blow":
      return new FesteringBlowSpell(id);
    case "cinder-wisp":
      return new CinderWispSpell(id);
    case "vital-strike":
      return new VitalStrikeSpell(id);
    case "basic-attack":
      return new BasicAttackSpell(id);
    default:
      throw new Error(`Unknown spell type: ${type}`);
  }
};
