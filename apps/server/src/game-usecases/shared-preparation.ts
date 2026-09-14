import { TRPCError } from "@trpc/server";
import type { DungeonKey } from "@loot-game/game/dungeons/dungeon-keys";
import { eq } from "drizzle-orm";
import { TB_character, TB_dungeonData, type Database } from "../db/schema";
import {
  TB_preparation,
  TB_preparationConnection,
} from "../db/shared-preparation-schema";
import { beginDungeonAttempt } from "./dungeon-attempt";
import { dungeonManager } from "./dungeon-manager";
import { EntityFactory } from "./entity-factory";
import { lockCharacters } from "./character-locks";
import { connectedPreparationUsers } from "./shared-preparation-presence";
import {
  clearPreparationGuest,
  lockPreparation,
  requireOpenPreparation,
  requirePreparationMember,
  requirePreparationRevision,
} from "./shared-preparation-membership";
import { cancelPreparationInvitations } from "./social-invitations";
import { lockSocialPair, requireFriendship } from "./social-relations";

export async function createPreparation(
  userId: string,
  key: DungeonKey,
  branching: boolean,
  db: Database,
) {
  const [preparation] = await db
    .insert(TB_preparation)
    .values({ hostUserId: userId, key, branching })
    .returning();
  return { id: preparation!.id };
}

export async function selectPreparationCharacter(
  id: string,
  userId: string,
  characterId: string,
  db: Database,
) {
  await db.transaction(async (tx) => {
    const preparation = await lockPreparation(id, tx);
    requireOpenPreparation(preparation);
    requirePreparationMember(preparation, userId);
    if (preparation.dungeonId)
      throw new TRPCError({
        code: "CONFLICT",
        message: "Characters stay fixed after this run starts",
      });
    const characters = await lockCharacters([characterId], tx);
    if (characters[0]?.userId !== userId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Select one of your own characters",
      });
    await tx
      .update(TB_preparation)
      .set({
        revision: preparation.revision + 1,
        ...(userId === preparation.hostUserId
          ? { hostCharacterId: characterId, hostReadyRevision: null }
          : { guestCharacterId: characterId, guestReadyRevision: null }),
      })
      .where(eq(TB_preparation.id, id));
  });
}

export async function setPreparationDungeon(
  id: string,
  userId: string,
  key: DungeonKey,
  branching: boolean,
  db: Database,
) {
  await db.transaction(async (tx) => {
    const preparation = await lockPreparation(id, tx);
    requireOpenPreparation(preparation);
    if (preparation.hostUserId !== userId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the host chooses the dungeon",
      });
    if (preparation.dungeonId)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This run has already started",
      });
    await tx
      .update(TB_preparation)
      .set({
        key,
        branching,
        hostReadyRevision: null,
        guestReadyRevision: null,
        revision: preparation.revision + 1,
      })
      .where(eq(TB_preparation.id, id));
  });
}

export async function readyPreparation(
  id: string,
  userId: string,
  ready: boolean,
  db: Database,
  expectedRevision: number,
  expectedBuildRevision: number | null,
) {
  await db.transaction(async (tx) => {
    // Match encounter start: run, then preparation, then character. A new run
    // created after this read still must acquire the preparation lock below.
    const [before] = await tx
      .select()
      .from(TB_preparation)
      .where(eq(TB_preparation.id, id));
    if (before?.dungeonId) {
      const [run] = await tx
        .select()
        .from(TB_dungeonData)
        .where(eq(TB_dungeonData.id, before.dungeonId))
        .for("update");
      if (
        !run ||
        run.activeBattle ||
        run.cleared ||
        run.abandonedAt ||
        !run.characterData.some((hero) => hero.health > 0)
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "This run is not waiting for an encounter",
        });
    }
    const preparation = await lockPreparation(id, tx);
    requireOpenPreparation(preparation);
    requirePreparationMember(preparation, userId);
    if (preparation.dungeonId !== before?.dungeonId)
      throw new TRPCError({
        code: "CONFLICT",
        message: "The run just started. Refresh preparation.",
      });
    const isHost = preparation.hostUserId === userId;
    const characterId = isHost
      ? preparation.hostCharacterId
      : preparation.guestCharacterId;
    let revision: number | null = null;
    if (ready) {
      requirePreparationRevision(preparation, expectedRevision);
      if (!characterId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select your character first",
        });
      await lockCharacters([characterId], tx);
      const [character] = await tx
        .select()
        .from(TB_character)
        .where(eq(TB_character.id, characterId));
      if (!character || character.userId !== userId)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not your character",
        });
      if (character.buildRevision !== expectedBuildRevision)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Your character build changed. Review it before readying again.",
        });
      if (!(await connectedPreparationUsers(id, tx)).has(userId))
        throw new TRPCError({
          code: "CONFLICT",
          message: "Connect to this preparation before marking ready",
        });
      revision = character.buildRevision;
    }
    await tx
      .update(TB_preparation)
      .set({
        revision: preparation.revision + (ready ? 0 : 1),
        ...(isHost
          ? { hostReadyRevision: revision }
          : { guestReadyRevision: revision }),
      })
      .where(eq(TB_preparation.id, id));
  });
}

export async function startPreparation(
  id: string,
  userId: string,
  db: Database,
  expectedRevision: number,
) {
  const [before] = await db
    .select()
    .from(TB_preparation)
    .where(eq(TB_preparation.id, id));
  if (before?.dungeonId)
    return {
      dungeonId: before.dungeonId,
      battleId: await beginDungeonAttempt(
        before.dungeonId,
        userId,
        db,
        expectedRevision,
      ),
    };
  if (!before)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Preparation not found",
    });
  if (before.hostUserId !== userId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the host starts an encounter",
    });
  if (!before.guestUserId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Both players must select a character",
    });
  return db.transaction(async (tx) => {
    await lockSocialPair(before.hostUserId, before.guestUserId!, tx);
    const preparation = await lockPreparation(id, tx);
    requireOpenPreparation(preparation);
    requirePreparationRevision(preparation, expectedRevision);
    if (preparation.hostUserId !== userId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the host starts an encounter",
      });
    if (preparation.dungeonId)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This run has already started",
      });
    if (preparation.guestUserId !== before.guestUserId)
      throw new TRPCError({
        code: "CONFLICT",
        message: "The guest changed. Refresh preparation.",
      });
    await requireFriendship(preparation.hostUserId, before.guestUserId!, tx);
    const selected = [
      preparation.hostCharacterId,
      preparation.guestCharacterId,
    ];
    if (
      !preparation.guestUserId ||
      selected.some((characterId) => !characterId)
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Both players must select a character",
      });
    await lockCharacters(selected as string[], tx);
    const characters = await Promise.all(
      selected.map((characterId) =>
        EntityFactory.createCharacter(characterId!, tx),
      ),
    );
    const dungeon = await dungeonManager.enterDungeon(
      characters,
      preparation.key as DungeonKey,
      userId,
      tx,
      { branching: preparation.branching, sharedPreparationId: id },
    );
    await tx
      .update(TB_preparation)
      .set({ dungeonId: dungeon.id })
      .where(eq(TB_preparation.id, id));
    const battleId = await beginDungeonAttempt(
      dungeon.id,
      userId,
      tx,
      expectedRevision,
    );
    return { dungeonId: dungeon.id, battleId };
  });
}

export async function leavePreparation(
  id: string,
  userId: string,
  db: Database,
) {
  await db.transaction(async (tx) => {
    const preparation = await lockPreparation(id, tx);
    requirePreparationMember(preparation, userId);
    if (preparation.dungeonId)
      throw new TRPCError({
        code: "CONFLICT",
        message: "Abandon the run to leave after it has started",
      });
    if (preparation.closedAt) return;
    if (preparation.hostUserId === userId) {
      await tx
        .update(TB_preparation)
        .set({
          closedAt: new Date(),
          hostReadyRevision: null,
          guestReadyRevision: null,
          revision: preparation.revision + 1,
        })
        .where(eq(TB_preparation.id, id));
      await tx
        .delete(TB_preparationConnection)
        .where(eq(TB_preparationConnection.preparationId, id));
      await cancelPreparationInvitations(id, tx);
    } else await clearPreparationGuest(preparation, tx);
  });
}

export async function playAgainTogether(
  dungeonId: string,
  userId: string,
  db: Database,
) {
  const [previous] = await db
    .select()
    .from(TB_preparation)
    .where(eq(TB_preparation.dungeonId, dungeonId));
  if (!previous || !previous.guestUserId)
    throw new TRPCError({ code: "NOT_FOUND", message: "Shared run not found" });
  requirePreparationMember(previous, userId);
  return db.transaction(async (tx) => {
    await lockSocialPair(previous.hostUserId, previous.guestUserId!, tx);
    await requireFriendship(previous.hostUserId, previous.guestUserId!, tx);
    const [run] = await tx
      .select()
      .from(TB_dungeonData)
      .where(eq(TB_dungeonData.id, dungeonId))
      .for("update");
    if (
      !run ||
      run.activeBattle ||
      run.abandonedAt ||
      (!run.cleared && run.characterData.some((hero) => hero.health > 0))
    )
      throw new TRPCError({
        code: "CONFLICT",
        message: "Finish this run before playing again together",
      });
    const [existing] = await tx
      .select()
      .from(TB_preparation)
      .where(eq(TB_preparation.replayOfDungeonId, dungeonId));
    if (existing) {
      if (existing.closedAt || existing.guestUserId !== previous.guestUserId)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "The next preparation was closed or your teammate left; send a fresh invitation",
        });
      return { id: existing.id };
    }
    const [next] = await tx
      .insert(TB_preparation)
      .values({
        key: previous.key,
        branching: previous.branching,
        hostUserId: previous.hostUserId,
        guestUserId: previous.guestUserId,
        replayOfDungeonId: dungeonId,
      })
      .returning();
    return { id: next!.id };
  });
}
