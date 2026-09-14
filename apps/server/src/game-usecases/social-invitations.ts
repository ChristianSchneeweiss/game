import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, lte, ne, or } from "drizzle-orm";
import { TB_user, type Database } from "../db/schema";
import { TB_preparation } from "../db/shared-preparation-schema";
import { TB_dungeonInvitation } from "../db/social-schema";
import {
  admitPreparationGuest,
  lockPreparation,
} from "./shared-preparation-membership";
import {
  areFriends,
  lockSocialPair,
  requireFriendship,
} from "./social-relations";

const invitationLifetime = 24 * 60 * 60 * 1000;
const pending = eq(TB_dungeonInvitation.status, "pending");

/** Caller holds this preparation's row lock; offline presence never calls this. */
export async function cancelPreparationInvitations(
  lobbyId: string,
  tx: Database,
) {
  await tx
    .update(TB_dungeonInvitation)
    .set({ status: "cancelled" })
    .where(and(eq(TB_dungeonInvitation.lobbyId, lobbyId), pending));
}

export async function getInvitations(userId: string, db: Database) {
  const addressed = or(
    eq(TB_dungeonInvitation.senderId, userId),
    eq(TB_dungeonInvitation.recipientId, userId),
  );
  await db
    .update(TB_dungeonInvitation)
    .set({ status: "expired" })
    .where(
      and(
        addressed,
        pending,
        lte(TB_dungeonInvitation.expiresAt, new Date(Date.now())),
      ),
    );
  const invitations = await db
    .select({ invitation: TB_dungeonInvitation, preparation: TB_preparation })
    .from(TB_dungeonInvitation)
    .innerJoin(
      TB_preparation,
      eq(TB_dungeonInvitation.lobbyId, TB_preparation.id),
    )
    .where(addressed)
    .orderBy(desc(TB_dungeonInvitation.createdAt));
  if (!invitations.length) return [];
  const accountIds = [
    ...new Set(
      invitations.flatMap(({ invitation }) => [
        invitation.senderId,
        invitation.recipientId,
      ]),
    ),
  ];
  const users = new Map(
    (
      await db
        .select({ id: TB_user.id, username: TB_user.username })
        .from(TB_user)
        .where(inArray(TB_user.id, accountIds))
    ).map((user) => [user.id, user]),
  );
  return invitations.map(({ invitation, preparation }) => ({
    id: invitation.id,
    lobbyId: invitation.lobbyId,
    sender: users.get(invitation.senderId)!,
    recipient: users.get(invitation.recipientId)!,
    dungeonKey: preparation.key,
    status: invitation.status,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  }));
}

export async function inviteToDungeon(
  lobbyId: string,
  recipientId: string,
  userId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    await lockSocialPair(userId, recipientId, tx);
    await requireFriendship(userId, recipientId, tx);
    const preparation = await lockPreparation(lobbyId, tx);
    if (preparation.hostUserId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the host can invite friends",
      });
    }
    if (
      preparation.closedAt ||
      preparation.dungeonId ||
      preparation.guestUserId
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This preparation has no available guest place",
      });
    }
    const now = new Date(Date.now());
    await tx
      .update(TB_dungeonInvitation)
      .set({ status: "expired" })
      .where(
        and(
          eq(TB_dungeonInvitation.lobbyId, lobbyId),
          pending,
          lte(TB_dungeonInvitation.expiresAt, now),
        ),
      );
    const [existing] = await tx
      .select()
      .from(TB_dungeonInvitation)
      .where(
        and(
          eq(TB_dungeonInvitation.lobbyId, lobbyId),
          eq(TB_dungeonInvitation.recipientId, recipientId),
          pending,
        ),
      );
    if (existing) return { id: existing.id, status: existing.status };
    const [created] = await tx
      .insert(TB_dungeonInvitation)
      .values({
        lobbyId,
        senderId: userId,
        recipientId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + invitationLifetime),
      })
      .returning({
        id: TB_dungeonInvitation.id,
        status: TB_dungeonInvitation.status,
      });
    return created!;
  });
}

export async function respondDungeonInvitation(
  invitationId: string,
  accept: boolean,
  userId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(TB_dungeonInvitation)
      .where(eq(TB_dungeonInvitation.id, invitationId));
    if (!initial || initial.recipientId !== userId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Dungeon invitation not found",
      });
    }
    await lockSocialPair(initial.senderId, initial.recipientId, tx);
    const preparation = await lockPreparation(initial.lobbyId, tx);
    const [invitation] = await tx
      .select()
      .from(TB_dungeonInvitation)
      .where(eq(TB_dungeonInvitation.id, invitationId))
      .for("update");
    if (invitation!.status !== "pending")
      return { lobbyId: initial.lobbyId, status: invitation!.status };
    const available =
      !preparation.closedAt &&
      !preparation.dungeonId &&
      !preparation.guestUserId;
    const status =
      invitation!.expiresAt.getTime() <= Date.now()
        ? "expired"
        : !available
          ? "unavailable"
          : !(await areFriends(initial.senderId, userId, tx))
            ? "cancelled"
            : accept
              ? "accepted"
              : "declined";
    if (status === "accepted") {
      await admitPreparationGuest(initial.lobbyId, userId, tx);
      // Only this dungeon's invitations compete for this one guest place.
      await tx
        .update(TB_dungeonInvitation)
        .set({ status: "unavailable" })
        .where(
          and(
            eq(TB_dungeonInvitation.lobbyId, initial.lobbyId),
            ne(TB_dungeonInvitation.id, invitationId),
            pending,
          ),
        );
    }
    await tx
      .update(TB_dungeonInvitation)
      .set({ status })
      .where(eq(TB_dungeonInvitation.id, invitationId));
    return { lobbyId: initial.lobbyId, status };
  });
}

export async function cancelDungeonInvitation(
  invitationId: string,
  userId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(TB_dungeonInvitation)
      .where(eq(TB_dungeonInvitation.id, invitationId));
    if (!initial || initial.senderId !== userId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Dungeon invitation not found",
      });
    }
    await lockPreparation(initial.lobbyId, tx);
    const [invitation] = await tx
      .select()
      .from(TB_dungeonInvitation)
      .where(eq(TB_dungeonInvitation.id, invitationId))
      .for("update");
    if (invitation!.status !== "pending") return { status: invitation!.status };
    const status =
      invitation!.expiresAt.getTime() <= Date.now() ? "expired" : "cancelled";
    await tx
      .update(TB_dungeonInvitation)
      .set({ status })
      .where(eq(TB_dungeonInvitation.id, invitationId));
    return { status };
  });
}
