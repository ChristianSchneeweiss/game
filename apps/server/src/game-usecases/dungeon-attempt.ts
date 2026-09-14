import { dungeonRunPhase } from "@loot-game/game/dungeons/run-state";
import { readDungeonRoute } from "@loot-game/game/dungeons/route-state";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  id,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_character,
  type Database,
} from "../db/schema";
import { getDungeonParty, requireDungeonParty } from "./dungeon-access";
import { readDungeon } from "./dungeon-queries";
import { dungeonManager } from "./dungeon-manager";
import { SyncFactory } from "./sync-factory";
import { lockCharacters } from "./character-locks";
import { TB_preparation } from "../db/shared-preparation-schema";
import { connectedPreparationUsers } from "./shared-preparation-presence";
import { requirePreparationRevision } from "./shared-preparation-membership";

/** Run -> preparation -> character locks, then atomic attempt/snapshot writes. */
export async function beginDungeonAttempt(
  dungeonId: string,
  userId: string,
  db: Database,
  expectedRevision?: number,
) {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(TB_dungeonData)
      .where(eq(TB_dungeonData.id, dungeonId))
      .for("update");
    if (!record || record.activeBattle || record.cleared || record.abandonedAt)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Dungeon is unavailable, already in a battle, or cleared",
      });
    const party = await getDungeonParty(dungeonId, tx);
    requireDungeonParty(
      record.createdBy,
      party,
      userId,
      "Only the dungeon creator or a participant's owner may start a battle",
    );
    const [preparation] = await tx
      .select()
      .from(TB_preparation)
      .where(eq(TB_preparation.dungeonId, dungeonId))
      .for("update");
    if (preparation && preparation.hostUserId !== userId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the host starts an encounter",
      });
    if (preparation) requirePreparationRevision(preparation, expectedRevision);
    const route = readDungeonRoute(record.route);
    const totalWaves = dungeonManager.getDungeonConfig(record.key)
      .availableEnemies.length;
    const phase = dungeonRunPhase({
      ...record,
      totalWaves,
      resources: record.characterData,
      route,
    });
    if (phase === "awaiting-choice")
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose your path before starting the next encounter",
      });
    if (phase === "defeated")
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Your party has fallen. Prepare a new run to recover.",
      });
    if (record.round < 0 || record.round >= totalWaves)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No encounter remains in this expedition",
      });
    // Slot mutations take the same character lock. Freeze either complete build,
    // never an intermediate replacement, and order locks across multi-owner parties.
    await lockCharacters(
      party.map((hero) => hero.characterId),
      tx,
    );
    if (preparation) {
      const connected = await connectedPreparationUsers(preparation.id, tx);
      const selections = [
        {
          userId: preparation.hostUserId,
          characterId: preparation.hostCharacterId,
          revision: preparation.hostReadyRevision,
        },
        {
          userId: preparation.guestUserId,
          characterId: preparation.guestCharacterId,
          revision: preparation.guestReadyRevision,
        },
      ];
      if (preparation.closedAt || party.length !== 2)
        throw new TRPCError({
          code: "CONFLICT",
          message: "This shared party is unavailable",
        });
      for (const selection of selections) {
        const [character] = selection.characterId
          ? await tx
              .select()
              .from(TB_character)
              .where(eq(TB_character.id, selection.characterId))
          : [];
        if (
          !character ||
          character.userId !== selection.userId ||
          !connected.has(character.userId) ||
          selection.revision === null ||
          character.buildRevision !== selection.revision ||
          !party.some((member) => member.characterId === character.id)
        )
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Both players must be connected and freshly ready for this encounter",
          });
      }
      await tx
        .update(TB_preparation)
        .set({
          hostReadyRevision: null,
          guestReadyRevision: null,
          revision: preparation.revision + 1,
        })
        .where(eq(TB_preparation.id, preparation.id));
    }
    const dungeon = await readDungeon(record, tx);
    const enemies = dungeon.actualEnemies[record.round];
    if (!enemies?.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Dungeon encounter is missing",
      });
    const battleId = id();
    await tx
      .update(TB_dungeonData)
      .set({ activeBattle: true, activeBattleId: battleId })
      .where(eq(TB_dungeonData.id, dungeonId));
    await tx
      .insert(TB_dungeonBattle)
      .values({ dungeonId, battleId, round: record.round });
    await new SyncFactory(tx).add(battleId, dungeon.playerTeam, enemies);
    return battleId;
  });
}
