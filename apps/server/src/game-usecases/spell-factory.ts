import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import { BasicAttackSpell } from "@loot-game/game/spells/basic-attack";
import { CharredChainsSpell } from "@loot-game/game/spells/charred-chains";
import { CinderWispSpell } from "@loot-game/game/spells/cinder-wisp";
import { CinderbrandSpell } from "@loot-game/game/spells/cinderbrand";
import { CrudeStrikeSpell } from "@loot-game/game/spells/crude-strike";
import { CrushingBlowSpell } from "@loot-game/game/spells/crushing-blow";
import { FesteringBlowSpell } from "@loot-game/game/spells/festering-blow";
import { FireballSpell } from "@loot-game/game/spells/fireball";
import { NaturesEmbrace } from "@loot-game/game/spells/natures-embrace";
import { PreciseThrustSpell } from "@loot-game/game/spells/precise-thrust";
import { RootgraspSpell } from "@loot-game/game/spells/rootgrasp";
import { SingleHealSpell } from "@loot-game/game/spells/single-heal";
import { SoulflareSpell } from "@loot-game/game/spells/soulflare";
import { SplinterShotSpell } from "@loot-game/game/spells/splinter-shot";
import { StoneBarkSpell } from "@loot-game/game/spells/stone-bark";
import { VerdantSmiteSpell } from "@loot-game/game/spells/verdant-smite";
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
    case "basic-attack":
      return new BasicAttackSpell(id);
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
    case "splinter-shot":
      return new SplinterShotSpell(id);
    case "cinderbrand":
      return new CinderbrandSpell(id);
    case "precise-thrust":
      return new PreciseThrustSpell(id);
    case "soulflare":
      return new SoulflareSpell(id);
    case "charred-chains":
      return new CharredChainsSpell(id);
    case "crushing-blow":
      return new CrushingBlowSpell(id);
    case "stone-bark":
      return new StoneBarkSpell(id);
    case "rootgrasp":
      return new RootgraspSpell(id);
    case "verdant-smite":
      return new VerdantSmiteSpell(id);
    case "natures-embrace":
      return new NaturesEmbrace(id);
    default:
      throw new Error(`Unknown spell type: ${type}`);
  }
};
