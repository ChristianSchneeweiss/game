import type { ItemType } from "@loot-game/game/items/item-types";
import type { PassiveType } from "@loot-game/game/passive-skills/base/passive-types";
import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import type { Loot, LootEntity } from "@loot-game/game/types";
import { and, eq } from "drizzle-orm";
import type seedrandom from "seedrandom";
import {
  TB_equipmentStats,
  TB_loot,
  TB_passivSkillStats,
  type Database,
} from "../db/schema";
import { createSpellInTransaction } from "./spell-factory";

export class LootManager {
  constructor(
    private userId: string,
    private db: Database
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
        if (item.type === "ITEM") {
          await this.claimItem(this.userId, item.data.itemType, tx);
        }
        if (item.type === "PASSIVE") {
          await this.claimPassive(this.userId, item.data.passiveType, tx);
        }
      }

      await tx.delete(TB_loot).where(eq(TB_loot.id, lootId));
    });
  }

  private async claimSpell(userId: string, type: SpellType, tx: Database) {
    await createSpellInTransaction(userId, type, tx);
  }

  private async claimItem(userId: string, type: ItemType, tx: Database) {
    await tx.insert(TB_equipmentStats).values({
      userId,
      type,
      slot: "ARMOR",
    });
  }

  private async claimPassive(userId: string, type: PassiveType, tx: Database) {
    await tx.insert(TB_passivSkillStats).values({
      userId,
      type,
    });
  }

  async getLoot() {
    const loot = await this.db
      .select()
      .from(TB_loot)
      .where(eq(TB_loot.userId, this.userId));
    return loot;
  }
}
