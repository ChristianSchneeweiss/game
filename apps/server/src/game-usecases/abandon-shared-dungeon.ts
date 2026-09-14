import { eq } from "drizzle-orm";
import { TB_dungeonData, type Database } from "../db/schema";
import { getDungeonParty, requireDungeonParty } from "./dungeon-access";
import {
  abandonDungeon,
  DungeonEncounterChangedError,
} from "./dungeon-abandon";
import { TRPCError } from "@trpc/server";

/** An active encounter must finish its durable command boundary before ending the run. */
export async function abandonSharedDungeon(
  dungeonId: string,
  userId: string,
  db: Database,
  env: Pick<Env, "BATTLE_WEBSOCKET">,
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const [record] = await db
      .select()
      .from(TB_dungeonData)
      .where(eq(TB_dungeonData.id, dungeonId));
    if (!record)
      throw new TRPCError({ code: "NOT_FOUND", message: "Dungeon not found" });
    requireDungeonParty(
      record.createdBy,
      await getDungeonParty(dungeonId, db),
      userId,
    );
    if (!record.activeBattle || !record.activeBattleId) {
      try {
        return await abandonDungeon(dungeonId, userId, db);
      } catch (error) {
        if (error instanceof DungeonEncounterChangedError) continue;
        throw error;
      }
    }
    const stub = env.BATTLE_WEBSOCKET.get(
      env.BATTLE_WEBSOCKET.idFromName(record.activeBattleId),
    );
    await stub.setup(record.activeBattleId);
    const result = await stub.abandon(dungeonId, userId);
    if (!("retry" in result)) return result;
  }
  throw new DungeonEncounterChangedError();
}
