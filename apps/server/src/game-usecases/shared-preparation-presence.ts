import { and, eq, gt, lte } from "drizzle-orm";
import type { Database } from "../db/schema";
import {
  TB_preparation,
  TB_preparationConnection,
} from "../db/shared-preparation-schema";
import {
  lockPreparation,
  requireOpenPreparation,
  requirePreparationMember,
  type Preparation,
} from "./shared-preparation-membership";

export const PREPARATION_PRESENCE_LEASE_MS = 45_000;
export type PreparationConnection = { userId: string; connectionId: string };
type PresenceRecord = typeof TB_preparationConnection.$inferSelect;

function preparationConnections(preparationId: string, db: Database) {
  return db
    .select()
    .from(TB_preparationConnection)
    .where(eq(TB_preparationConnection.preparationId, preparationId));
}

async function updatePresenceConsent(
  preparation: Preparation,
  before: PresenceRecord[],
  after: PresenceRecord[],
  now: number,
  tx: Database,
) {
  const afterById = new Map(
    after.map((connection) => [connection.connectionId, connection.userId]),
  );
  const changed =
    before.length !== after.length ||
    before.some(
      (connection) =>
        connection.expiresAt.getTime() <= now ||
        afterById.get(connection.connectionId) !== connection.userId,
    );
  if (!changed) return;
  // A surviving socket preserves continuous attendance across multiple tabs.
  // Replacing the last socket or renewing an expired lease is fresh attendance.
  const continuingUsers = new Set(
    before
      .filter(
        (connection) =>
          connection.expiresAt.getTime() > now &&
          afterById.get(connection.connectionId) === connection.userId,
      )
      .map((connection) => connection.userId),
  );
  await tx
    .update(TB_preparation)
    .set({
      revision: preparation.revision + 1,
      hostReadyRevision: continuingUsers.has(preparation.hostUserId)
        ? preparation.hostReadyRevision
        : null,
      guestReadyRevision:
        preparation.guestUserId && continuingUsers.has(preparation.guestUserId)
          ? preparation.guestReadyRevision
          : null,
    })
    .where(eq(TB_preparation.id, preparation.id));
}

export async function connectedPreparationUsers(
  preparationId: string,
  db: Database,
) {
  const connections = await db
    .select({ userId: TB_preparationConnection.userId })
    .from(TB_preparationConnection)
    .where(
      and(
        eq(TB_preparationConnection.preparationId, preparationId),
        gt(TB_preparationConnection.expiresAt, new Date()),
      ),
    );
  return new Set(connections.map((connection) => connection.userId));
}

/** Only the authenticated presence Durable Object may supply this complete set. */
export async function reconcilePreparationPresence(
  preparationId: string,
  connections: PreparationConnection[],
  db: Database,
) {
  return db.transaction(async (tx) => {
    const preparation = await lockPreparation(preparationId, tx);
    const previous = await preparationConnections(preparationId, tx);
    const now = Date.now();
    const admitted = preparation.closedAt
      ? []
      : connections.filter(
          (connection) =>
            connection.userId === preparation.hostUserId ||
            connection.userId === preparation.guestUserId,
        );
    const next = admitted.map((connection) => ({
      ...connection,
      preparationId,
      expiresAt: new Date(now + PREPARATION_PRESENCE_LEASE_MS),
    }));
    await tx
      .delete(TB_preparationConnection)
      .where(eq(TB_preparationConnection.preparationId, preparationId));
    if (next.length) await tx.insert(TB_preparationConnection).values(next);
    await updatePresenceConsent(preparation, previous, next, now, tx);
    return admitted;
  });
}

/** Useful at authenticated transport and integration-test boundaries. */
export async function setPreparationConnected(
  preparationId: string,
  userId: string,
  connectionId: string,
  connected: boolean,
  db: Database,
) {
  return db.transaction(async (tx) => {
    const preparation = await lockPreparation(preparationId, tx);
    if (connected) {
      requireOpenPreparation(preparation);
      requirePreparationMember(preparation, userId);
    }
    const before = await preparationConnections(preparationId, tx);
    const now = Date.now();
    await tx
      .delete(TB_preparationConnection)
      .where(
        and(
          eq(TB_preparationConnection.preparationId, preparationId),
          lte(TB_preparationConnection.expiresAt, new Date(now)),
        ),
      );
    if (connected)
      await tx
        .insert(TB_preparationConnection)
        .values({
          preparationId,
          userId,
          connectionId,
          expiresAt: new Date(Date.now() + PREPARATION_PRESENCE_LEASE_MS),
        })
        .onConflictDoUpdate({
          target: TB_preparationConnection.connectionId,
          set: {
            expiresAt: new Date(Date.now() + PREPARATION_PRESENCE_LEASE_MS),
          },
        });
    else
      await tx
        .delete(TB_preparationConnection)
        .where(
          and(
            eq(TB_preparationConnection.preparationId, preparationId),
            eq(TB_preparationConnection.userId, userId),
            eq(TB_preparationConnection.connectionId, connectionId),
          ),
        );
    await updatePresenceConsent(
      preparation,
      before,
      await preparationConnections(preparationId, tx),
      now,
      tx,
    );
  });
}
