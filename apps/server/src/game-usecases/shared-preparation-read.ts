import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
  TB_character,
  TB_dungeonData,
  TB_user,
  type Database,
} from "../db/schema";
import { TB_preparation } from "../db/shared-preparation-schema";
import { dungeonManager } from "./dungeon-manager";
import { connectedPreparationUsers } from "./shared-preparation-presence";
import {
  requirePreparationMember,
  type Preparation,
} from "./shared-preparation-membership";
import { dungeonRunPhase } from "@loot-game/game/dungeons/run-state";
import { readDungeonRoute } from "@loot-game/game/dungeons/route-state";

export async function readPreparation(preparation: Preparation, db: Database) {
  const userIds = [preparation.hostUserId, preparation.guestUserId].filter(
    (id): id is string => !!id,
  );
  const users = await db
    .select()
    .from(TB_user)
    .where(inArray(TB_user.id, userIds));
  const characterIds = [
    preparation.hostCharacterId,
    preparation.guestCharacterId,
  ].filter((id): id is string => !!id);
  const characters = characterIds.length
    ? await db
        .select()
        .from(TB_character)
        .where(inArray(TB_character.id, characterIds))
    : [];
  const connected = await connectedPreparationUsers(preparation.id, db);
  const participants = userIds.map((userId) => {
    const isHost = userId === preparation.hostUserId;
    const characterId = isHost
      ? preparation.hostCharacterId
      : preparation.guestCharacterId;
    const revision = isHost
      ? preparation.hostReadyRevision
      : preparation.guestReadyRevision;
    const character = characters.find((hero) => hero.id === characterId);
    return {
      userId,
      username: users.find((user) => user.id === userId)!.username,
      characterId,
      characterName: character?.name ?? null,
      buildRevision: character?.buildRevision ?? null,
      isHost,
      connected: connected.has(userId),
      ready:
        !!character &&
        revision === character.buildRevision &&
        connected.has(userId),
    };
  });
  const [run] = preparation.dungeonId
    ? await db
        .select()
        .from(TB_dungeonData)
        .where(eq(TB_dungeonData.id, preparation.dungeonId))
    : [];
  const phase = run
    ? dungeonRunPhase({
        ...run,
        resources: run.characterData,
        totalWaves: dungeonManager.getDungeonConfig(run.key).availableEnemies
          .length,
        route: readDungeonRoute(run.route),
      })
    : "prepared";
  return {
    ...preparation,
    name: dungeonManager.getDungeonConfig(preparation.key).name,
    participants,
    canStart:
      !preparation.closedAt &&
      (phase === "prepared" || phase === "ready") &&
      participants.length === 2 &&
      participants.every((participant) => participant.ready),
  };
}

export async function getPreparation(id: string, userId: string, db: Database) {
  const [preparation] = await db
    .select()
    .from(TB_preparation)
    .where(eq(TB_preparation.id, id));
  if (!preparation)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Preparation not found",
    });
  requirePreparationMember(preparation, userId);
  return readPreparation(preparation, db);
}

export async function listPreparations(userId: string, db: Database) {
  const preparations = await db
    .select()
    .from(TB_preparation)
    .where(
      and(
        isNull(TB_preparation.closedAt),
        or(
          eq(TB_preparation.hostUserId, userId),
          eq(TB_preparation.guestUserId, userId),
        ),
      ),
    )
    .orderBy(TB_preparation.createdAt);
  return Promise.all(
    preparations.map((preparation) => readPreparation(preparation, db)),
  );
}
