import type { SpellType } from "@loot-game/game/spell-types";
import type { Loot, LootEntity } from "@loot-game/game/types";
import { and, eq } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type seedrandom from "seedrandom";
import { TB_loot } from "../db/schema";
import { createSpellInTransaction } from "./spell-factory";

export class LootManager {
  constructor(
    private userId: string,
    private db: PostgresJsDatabase
  ) {}

  async drop(rng: seedrandom.PRNG, loot: Loot) {
    const droppedLoot: LootEntity[] = [];
    for (const item of loot.items) {
      if (rng() < item.dropRate) {
        droppedLoot.push(item);
      }
    }

    return droppedLoot;
  }

  async claim(lootId: string) {
    await this.db.transaction(async (tx) => {
      const [loot] = await tx
        .select()
        .from(TB_loot)
        .where(and(eq(TB_loot.id, lootId), eq(TB_loot.userId, this.userId)));

      if (!loot) {
        throw new Error("Loot not found");
      }

      for (const item of loot.items) {
        if (item.type === "SPELL") {
          await this.claimSpell(this.userId, item.data.spellType, tx);
        }
      }

      await tx.delete(TB_loot).where(eq(TB_loot.id, lootId));
    });
  }

  private async claimSpell(
    userId: string,
    type: SpellType,
    tx: PgTransaction<any, any, any>
  ) {
    await createSpellInTransaction(userId, type, tx);
  }

  async getLoot() {
    const loot = await this.db
      .select()
      .from(TB_loot)
      .where(eq(TB_loot.userId, this.userId));
    return loot;
  }
}
