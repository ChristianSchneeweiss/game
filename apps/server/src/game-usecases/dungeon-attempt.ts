import { dungeonRunPhase } from "@loot-game/game/dungeons/run-state";
import { readDungeonRoute } from "@loot-game/game/dungeons/route-state";
import { createEncounterGrid } from "@loot-game/game/tactical/encounters";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import {
  id,
  TB_dungeonBattle,
  TB_dungeonData,
  TB_character,
  TB_battleStart,
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
import { deserializeStartingGrid } from "../battle/starting-build-codec";
import { reserveBattleSupplies } from "./battle-supplies";

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
    await reserveBattleSupplies(dungeon.playerTeam, tx);
    await tx
      .update(TB_dungeonData)
      .set({ activeBattle: true, activeBattleId: battleId })
      .where(eq(TB_dungeonData.id, dungeonId));
    await tx
      .insert(TB_dungeonBattle)
      .values({ dungeonId, battleId, round: record.round });
    // Retrying a wave uses its first captured layout even if authoring changed.
    const [prior] = await tx
      .select({ builds: TB_battleStart.builds })
      .from(TB_dungeonBattle)
      .innerJoin(
        TB_battleStart,
        eq(TB_battleStart.battleId, TB_dungeonBattle.battleId),
      )
      .where(
        and(
          eq(TB_dungeonBattle.dungeonId, dungeonId),
          eq(TB_dungeonBattle.round, record.round),
        ),
      )
      .orderBy(desc(TB_dungeonBattle.createdAt), desc(TB_dungeonBattle.id))
      .limit(1);
    const layout = dungeonManager.getDungeonConfig(record.key).battlefields?.[
      record.round
    ];
    const frozenGrid = prior
      ? deserializeStartingGrid(prior.builds)
      : undefined;
    if (!frozenGrid && !layout)
      throw new Error("Dungeon encounter layout is missing");
    const grid =
      frozenGrid ??
      createEncounterGrid(layout!, [...dungeon.playerTeam, ...enemies]);
    await new SyncFactory(tx).add(battleId, dungeon.playerTeam, enemies, grid);
    return battleId;
  });
}
