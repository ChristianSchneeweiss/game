import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TB_player, TB_spellStats } from "../db/schema";

export const createInitialPlayer = async (
  name: string,
  userId: string,
  db: PostgresJsDatabase
) => {
  await db.transaction(async (tx) => {
    const [player] = await tx
      .insert(TB_player)
      .values({
        name,
        userId,
        health: 100,
        mana: 50,
        intelligence: 10,
        vitality: 10,
        agility: 10,
        strength: 10,
      })
      .onConflictDoNothing()
      .returning();
    const spellStats = await tx.insert(TB_spellStats).values([
      {
        playerId: player.id,
        type: "fireball",
      },
      {
        playerId: player.id,
        type: "autoattack",
      },
    ]);

    return player;
  });
};
