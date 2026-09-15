import { itemQuantity } from "@loot-game/game/items/quantity";
import type { PassiveType } from "@loot-game/game/passive-skills/base/passive-types";
import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import {
  LootEntitySchema,
  type Loot,
  type LootEntity,
} from "@loot-game/game/types";
import { and, eq } from "drizzle-orm";
import type seedrandom from "seedrandom";
import { TB_loot, TB_passivSkillStats, type Database } from "../db/schema";
import { createSpell } from "./spell-factory";
import { grantItems } from "./inventory";

function validateRewards(items: LootEntity[]) {
  // Validate the full batch before any roll or mutation. Preserve legacy shapes
  // and entry order so existing random consumption and recordings stay stable.
  LootEntitySchema.array().parse(items);
  for (const item of items) if (item.type === "ITEM") itemQuantity(item.data);
}

export class LootManager {
  constructor(
    private userId: string,
    private db: Database,
  ) {}

  async drop(rng: seedrandom.PRNG, loot: Loot) {
    validateRewards(loot.items);
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
        .where(and(eq(TB_loot.id, lootId), eq(TB_loot.userId, this.userId)))
        .for("update");

      if (!loot) {
        throw new Error("Loot not found");
      }

      validateRewards(loot.items);
      await grantItems(
        this.userId,
        loot.items.flatMap((item) =>
          item.type === "ITEM"
            ? [{ type: item.data.itemType, quantity: itemQuantity(item.data) }]
            : [],
        ),
        tx,
      );
      for (const item of loot.items) {
        if (item.type === "SPELL") {
          await this.claimSpell(this.userId, item.data.spellType, tx);
        }
        if (item.type === "PASSIVE") {
          await this.claimPassive(this.userId, item.data.passiveType, tx);
        }
      }

      await tx.delete(TB_loot).where(eq(TB_loot.id, lootId));
    });
  }

  private async claimSpell(userId: string, type: SpellType, tx: Database) {
    await createSpell(userId, type, tx);
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
    for (const reward of loot) validateRewards(reward.items);
    return loot;
  }
}
