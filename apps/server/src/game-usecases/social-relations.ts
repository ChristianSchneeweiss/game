import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { TB_user, type Database } from "../db/schema";
import {
  TB_dungeonInvitation,
  TB_friendCode,
  TB_friendRequest,
  TB_friendship,
  TB_playerBlock,
} from "../db/social-schema";
import { separatePreparations } from "./shared-preparation-membership";

const pair = (a: string, b: string) => [a, b].sort() as [string, string];
const requestPair = (a: string, b: string) =>
  or(
    and(eq(TB_friendRequest.senderId, a), eq(TB_friendRequest.recipientId, b)),
    and(eq(TB_friendRequest.senderId, b), eq(TB_friendRequest.recipientId, a)),
  );
const player = { id: TB_user.id, username: TB_user.username };

// Account locks serialize eligibility changes with admission. Every operation
// acquires these in the same order, before preparation and invitation locks.
export async function lockSocialPair(a: string, b: string, db: Database) {
  if (a === b)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose another player",
    });
  const users = await db
    .select(player)
    .from(TB_user)
    .where(inArray(TB_user.id, pair(a, b)))
    .orderBy(asc(TB_user.id))
    .for("no key update");
  if (users.length !== 2)
    throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
}

async function isBlocked(a: string, b: string, db: Database) {
  const [block] = await db
    .select()
    .from(TB_playerBlock)
    .where(
      or(
        and(eq(TB_playerBlock.blockerId, a), eq(TB_playerBlock.blockedId, b)),
        and(eq(TB_playerBlock.blockerId, b), eq(TB_playerBlock.blockedId, a)),
      ),
    )
    .limit(1);
  return Boolean(block);
}

export async function areFriends(a: string, b: string, db: Database) {
  const [userA, userB] = pair(a, b);
  const [friendship] = await db
    .select()
    .from(TB_friendship)
    .where(and(eq(TB_friendship.userA, userA), eq(TB_friendship.userB, userB)));
  return Boolean(friendship) && !(await isBlocked(a, b, db));
}

export async function requireFriendship(a: string, b: string, db: Database) {
  if (!(await areFriends(a, b, db))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "An accepted friendship is required",
    });
  }
}

async function getFriendCode(userId: string, db: Database) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await db.insert(TB_friendCode).values({ userId }).onConflictDoNothing();
    const [record] = await db
      .select()
      .from(TB_friendCode)
      .where(eq(TB_friendCode.userId, userId));
    if (record) return record.code;
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Could not create a friend code",
  });
}

export async function getFriends(userId: string, db: Database) {
  const code = await getFriendCode(userId, db);
  const friendships = await db
    .select()
    .from(TB_friendship)
    .where(
      or(eq(TB_friendship.userA, userId), eq(TB_friendship.userB, userId)),
    );
  const requests = await db
    .select()
    .from(TB_friendRequest)
    .where(
      and(
        or(
          eq(TB_friendRequest.senderId, userId),
          eq(TB_friendRequest.recipientId, userId),
        ),
        eq(TB_friendRequest.status, "pending"),
      ),
    )
    .orderBy(desc(TB_friendRequest.createdAt));
  const blocks = await db
    .select()
    .from(TB_playerBlock)
    .where(eq(TB_playerBlock.blockerId, userId));
  const relatedIds = new Set([
    userId,
    ...friendships.flatMap((friendship) => [
      friendship.userA,
      friendship.userB,
    ]),
    ...requests.flatMap((request) => [request.senderId, request.recipientId]),
    ...blocks.map((block) => block.blockedId),
  ]);
  const users = new Map(
    (
      await db
        .select(player)
        .from(TB_user)
        .where(inArray(TB_user.id, [...relatedIds]))
    ).map((user) => [user.id, user]),
  );
  const views = requests.map((request) => ({
    id: request.id,
    status: request.status,
    createdAt: request.createdAt,
    sender: users.get(request.senderId)!,
    recipient: users.get(request.recipientId)!,
  }));
  return {
    code,
    friends: friendships.map(
      (friendship) =>
        users.get(
          friendship.userA === userId ? friendship.userB : friendship.userA,
        )!,
    ),
    incoming: views.filter((request) => request.recipient.id === userId),
    outgoing: views.filter((request) => request.sender.id === userId),
    blocked: blocks.map((block) => users.get(block.blockedId)!),
  };
}

export async function lookupFriendCode(
  code: string,
  userId: string,
  db: Database,
) {
  const [found] = await db
    .select(player)
    .from(TB_friendCode)
    .innerJoin(TB_user, eq(TB_friendCode.userId, TB_user.id))
    .where(eq(TB_friendCode.code, code.replace(/[\s-]/g, "").toUpperCase()));
  if (!found || (await isBlocked(userId, found.id, db))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Friend code not found",
    });
  }
  return found;
}

export async function sendFriendRequest(
  userId: string,
  recipientId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    await lockSocialPair(userId, recipientId, tx);
    if (await isBlocked(userId, recipientId, tx)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Friend request unavailable",
      });
    }
    if (await areFriends(userId, recipientId, tx)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You are already friends",
      });
    }
    const [pending] = await tx
      .select()
      .from(TB_friendRequest)
      .where(
        and(
          requestPair(userId, recipientId),
          eq(TB_friendRequest.status, "pending"),
        ),
      );
    if (pending) return { id: pending.id, status: pending.status };
    const [created] = await tx
      .insert(TB_friendRequest)
      .values({ senderId: userId, recipientId })
      .returning({ id: TB_friendRequest.id, status: TB_friendRequest.status });
    return created!;
  });
}

export async function respondFriendRequest(
  requestId: string,
  accept: boolean,
  userId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(TB_friendRequest)
      .where(eq(TB_friendRequest.id, requestId));
    if (!initial || initial.recipientId !== userId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Friend request not found",
      });
    }
    await lockSocialPair(initial.senderId, initial.recipientId, tx);
    const [request] = await tx
      .select()
      .from(TB_friendRequest)
      .where(eq(TB_friendRequest.id, requestId))
      .for("update");
    if (request!.status !== "pending") return { status: request!.status };
    if (await isBlocked(initial.senderId, userId, tx)) {
      await tx
        .update(TB_friendRequest)
        .set({ status: "cancelled" })
        .where(eq(TB_friendRequest.id, requestId));
      return { status: "cancelled" as const };
    }
    const status = accept ? "accepted" : "declined";
    if (accept) {
      const [userA, userB] = pair(initial.senderId, userId);
      await tx
        .insert(TB_friendship)
        .values({ userA, userB })
        .onConflictDoNothing();
    }
    await tx
      .update(TB_friendRequest)
      .set({ status })
      .where(eq(TB_friendRequest.id, requestId));
    return { status };
  });
}

async function disconnectPair(userId: string, otherId: string, tx: Database) {
  const [userA, userB] = pair(userId, otherId);
  await tx
    .delete(TB_friendship)
    .where(and(eq(TB_friendship.userA, userA), eq(TB_friendship.userB, userB)));
  await separatePreparations(userId, otherId, tx);
  await tx
    .update(TB_dungeonInvitation)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(TB_dungeonInvitation.status, "pending"),
        or(
          and(
            eq(TB_dungeonInvitation.senderId, userId),
            eq(TB_dungeonInvitation.recipientId, otherId),
          ),
          and(
            eq(TB_dungeonInvitation.senderId, otherId),
            eq(TB_dungeonInvitation.recipientId, userId),
          ),
        ),
      ),
    );
  await tx
    .update(TB_friendRequest)
    .set({ status: "cancelled" })
    .where(
      and(requestPair(userId, otherId), eq(TB_friendRequest.status, "pending")),
    );
}

export async function removeFriend(
  userId: string,
  otherId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    await lockSocialPair(userId, otherId, tx);
    await disconnectPair(userId, otherId, tx);
    return { success: true as const };
  });
}

export async function blockPlayer(
  userId: string,
  otherId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    await lockSocialPair(userId, otherId, tx);
    await tx
      .insert(TB_playerBlock)
      .values({ blockerId: userId, blockedId: otherId })
      .onConflictDoNothing();
    await disconnectPair(userId, otherId, tx);
    return { success: true as const };
  });
}

export async function unblockPlayer(
  userId: string,
  otherId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    await lockSocialPair(userId, otherId, tx);
    await tx
      .delete(TB_playerBlock)
      .where(
        and(
          eq(TB_playerBlock.blockerId, userId),
          eq(TB_playerBlock.blockedId, otherId),
        ),
      );
    return { success: true as const };
  });
}
