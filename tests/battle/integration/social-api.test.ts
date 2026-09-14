import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { TB_user } from "../../../apps/server/src/db/schema";
import type { Context } from "../../../apps/server/src/lib/context";
import { appRouter } from "../../../apps/server/src/routers";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
const host = "audit-owner";
const guest = "friend-guest";
const other = "friend-other";
const outsider = "friend-outsider";
const caller = (id = host) =>
  appRouter.createCaller({
    db: data.db,
    session: { id },
  } as unknown as Context);

beforeEach(async () => {
  data = await database();
  await data.db.insert(TB_user).values([
    { id: guest, username: "Guest" },
    { id: other, username: "Other" },
    { id: outsider, username: "Outsider" },
  ]);
});
afterEach(async () => {
  await data.close();
});

async function befriend(a = host, b = guest) {
  const request = await caller(a).social.sendRequest({ userId: b });
  await caller(b).social.respondRequest({
    requestId: request.id,
    accept: true,
  });
}
async function prepare(owner = host) {
  return caller(owner).preparation.create({
    key: "trial-of-the-nature",
    branching: false,
  });
}
async function invite(lobbyId: string, recipient = guest, owner = host) {
  return caller(owner).social.invite({ lobbyId, userId: recipient });
}
async function accept(invitationId: string, recipient = guest) {
  return caller(recipient).social.respondInvitation({
    invitationId,
    accept: true,
  });
}

describe("authenticated friendships", () => {
  test("stable private codes identify accounts; duplicate and reciprocal requests require recipient consent", async () => {
    const initial = await caller(guest).social.getFriends();
    expect(initial.code).toMatch(/^[A-Z2-9]{12}$/);
    expect((await caller(guest).social.getFriends()).code).toBe(initial.code);
    expect((await caller().social.getFriends()).code).not.toBe(initial.code);
    expect(
      await caller().social.lookupCode({ code: initial.code.toLowerCase() }),
    ).toEqual({ id: guest, username: "Guest" });
    await expect(caller().social.sendRequest({ userId: host })).rejects.toThrow(
      "another player",
    );
    const [first, repeated] = await Promise.all([
      caller().social.sendRequest({ userId: guest }),
      caller().social.sendRequest({ userId: guest }),
    ]);
    expect(repeated.id).toBe(first.id);
    expect((await caller(guest).social.sendRequest({ userId: host })).id).toBe(
      first.id,
    );
    expect((await caller().social.getFriends()).friends).toEqual([]);
    expect((await caller(guest).social.getFriends()).incoming).toHaveLength(1);
    expect((await caller(outsider).social.getFriends()).incoming).toEqual([]);
    await expect(
      caller(outsider).social.respondRequest({
        requestId: first.id,
        accept: true,
      }),
    ).rejects.toThrow();
    await expect(
      caller().social.respondRequest({ requestId: first.id, accept: true }),
    ).rejects.toThrow();
    await caller(guest).social.respondRequest({
      requestId: first.id,
      accept: true,
    });
    await caller(guest).social.respondRequest({
      requestId: first.id,
      accept: true,
    });
    expect((await caller().social.getFriends()).friends).toEqual([
      { id: guest, username: "Guest" },
    ]);
    expect(
      (await caller(guest).social.getFriends()).friends.map(
        (friend) => friend.id,
      ),
    ).toEqual([host]);
    expect((await caller().social.getFriends()).outgoing).toEqual([]);
    await expect(
      caller().social.sendRequest({ userId: guest }),
    ).rejects.toThrow("already friends");
  });

  test("declining and blocking terminate requests; stale codes and responses cannot bypass a block", async () => {
    const code = (await caller(guest).social.getFriends()).code;
    const declined = await caller().social.sendRequest({ userId: guest });
    expect(
      await caller(guest).social.respondRequest({
        requestId: declined.id,
        accept: false,
      }),
    ).toEqual({ status: "declined" });
    expect(
      await caller(guest).social.respondRequest({
        requestId: declined.id,
        accept: true,
      }),
    ).toEqual({ status: "declined" });
    const pending = await caller().social.sendRequest({ userId: guest });
    expect(pending.id).not.toBe(declined.id);
    await caller(guest).social.block({ userId: host });
    expect(
      await caller(guest).social.respondRequest({
        requestId: pending.id,
        accept: true,
      }),
    ).toEqual({ status: "cancelled" });
    await expect(caller().social.lookupCode({ code })).rejects.toThrow(
      "not found",
    );
    await expect(
      caller().social.sendRequest({ userId: guest }),
    ).rejects.toThrow("unavailable");
    await expect(
      caller(guest).social.sendRequest({ userId: host }),
    ).rejects.toThrow("unavailable");
    await caller().social.unblock({ userId: guest });
    await expect(
      caller().social.sendRequest({ userId: guest }),
    ).rejects.toThrow("unavailable");
    expect(
      (await caller(guest).social.getFriends()).blocked.map(
        (player) => player.id,
      ),
    ).toEqual([host]);
    await caller(guest).social.unblock({ userId: host });
    expect((await caller().social.getFriends()).friends).toEqual([]);
    await befriend();
    await caller().social.block({ userId: guest });
    expect((await caller(guest).social.getFriends()).friends).toEqual([]);
  });

  test("anonymous accounts cannot read private social state", async () => {
    const anonymous = appRouter.createCaller({
      db: data.db,
      session: null,
    } as unknown as Context);
    await expect(anonymous.social.getFriends()).rejects.toThrow("UNAUTHORIZED");
    await expect(anonymous.social.getInvitations()).rejects.toThrow(
      "UNAUTHORIZED",
    );
  });
});

describe("durable dungeon invitations", () => {
  test("only the host can invite accepted friends and only the addressed account can respond", async () => {
    const lobby = await prepare();
    await expect(invite(lobby.id)).rejects.toThrow("friendship");
    await befriend();
    await befriend(guest, other);
    await expect(invite(lobby.id, other, guest)).rejects.toThrow("host");
    const invitation = await invite(lobby.id);
    expect((await invite(lobby.id)).id).toBe(invitation.id);
    expect((await caller(guest).social.getInvitations())[0]).toMatchObject({
      id: invitation.id,
      lobbyId: lobby.id,
      sender: { id: host },
      recipient: { id: guest },
      dungeonKey: "trial-of-the-nature",
      status: "pending",
    });
    expect(await caller(outsider).social.getInvitations()).toEqual([]);
    await expect(accept(invitation.id, outsider)).rejects.toThrow("not found");
    await expect(accept(invitation.id, host)).rejects.toThrow("not found");
    await expect(
      caller(guest).social.cancelInvitation({ invitationId: invitation.id }),
    ).rejects.toThrow("not found");
    await expect(
      caller(guest).preparation.get({ id: lobby.id }),
    ).rejects.toThrow();
    expect(
      await caller(guest).social.respondInvitation({
        invitationId: invitation.id,
        accept: false,
      }),
    ).toMatchObject({ status: "declined" });
    expect(await accept(invitation.id)).toMatchObject({ status: "declined" });
    const retry = await invite(lobby.id);
    await caller().social.cancelInvitation({ invitationId: retry.id });
    expect(await accept(retry.id)).toMatchObject({ status: "cancelled" });
  });

  test("the first accepted invitation wins one place and leaves other dungeon invitations intact", async () => {
    await befriend();
    await befriend(host, other);
    const firstLobby = await prepare();
    const secondLobby = await prepare();
    const first = await invite(firstLobby.id);
    const competitor = await invite(firstLobby.id, other);
    const elsewhere = await invite(secondLobby.id, other);
    const outcomes = await Promise.all([
      accept(first.id),
      accept(competitor.id, other),
    ]);
    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([
      "accepted",
      "unavailable",
    ]);
    const winningGuest = outcomes[0]!.status === "accepted" ? guest : other;
    expect(
      (await caller().preparation.get({ id: firstLobby.id })).guestUserId,
    ).toBe(winningGuest);
    await accept(
      outcomes[0]!.status === "accepted" ? first.id : competitor.id,
      winningGuest,
    );
    expect(
      (await caller(other).social.getInvitations()).find(
        (entry) => entry.id === elsewhere.id,
      )?.status,
    ).toBe("pending");
    expect(await accept(elsewhere.id, other)).toMatchObject({
      status: "accepted",
    });
    expect(
      (await caller(other).preparation.list()).length,
    ).toBeGreaterThanOrEqual(1);
  });

  test("offline invitations survive until the exact 24-hour boundary; accepted membership does not expire", async () => {
    await befriend();
    const lobby = await prepare();
    const invitation = await invite(lobby.id);
    const entry = (await caller(guest).social.getInvitations())[0]!;
    expect(entry.expiresAt.getTime() - entry.createdAt.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
    const clock = spyOn(Date, "now").mockReturnValue(
      entry.expiresAt.getTime() - 1,
    );
    try {
      expect((await caller(guest).social.getInvitations())[0]!.status).toBe(
        "pending",
      );
      clock.mockReturnValue(entry.expiresAt.getTime());
      expect(await accept(invitation.id)).toMatchObject({ status: "expired" });
      await expect(
        caller(guest).preparation.get({ id: lobby.id }),
      ).rejects.toThrow();
      const renewed = await invite(lobby.id);
      expect(await accept(renewed.id)).toMatchObject({ status: "accepted" });
      clock.mockReturnValue(entry.expiresAt.getTime() + 48 * 60 * 60 * 1000);
      expect(
        (await caller(guest).social.getInvitations()).find(
          (item) => item.id === renewed.id,
        )?.status,
      ).toBe("accepted");
      expect(
        (await caller(guest).preparation.get({ id: lobby.id })).guestUserId,
      ).toBe(guest);
    } finally {
      clock.mockRestore();
    }
  });

  test("guest departure frees a place without reviving invitations; host departure closes its lobby", async () => {
    await befriend();
    await befriend(host, other);
    const lobby = await prepare();
    const accepted = await invite(lobby.id);
    const closed = await invite(lobby.id, other);
    await accept(accepted.id);
    await caller(guest).preparation.leave({ id: lobby.id });
    expect(
      (await caller().preparation.get({ id: lobby.id })).guestUserId,
    ).toBeNull();
    await accept(accepted.id);
    expect(
      (await caller().preparation.get({ id: lobby.id })).guestUserId,
    ).toBeNull();
    expect(await accept(closed.id, other)).toMatchObject({
      status: "unavailable",
    });
    const replacement = await invite(lobby.id, other);
    await caller().preparation.leave({ id: lobby.id });
    expect(await accept(replacement.id, other)).toMatchObject({
      status: "cancelled",
    });
    await expect(invite(lobby.id)).rejects.toThrow("available");
  });

  test("removing or blocking a pair separates every preparation and cancels only their pending invitations", async () => {
    await befriend();
    await befriend(host, other);
    const one = await prepare();
    const two = await prepare(guest);
    await accept((await invite(one.id)).id);
    await accept((await invite(two.id, host, guest)).id, host);
    const pendingLobby = await prepare();
    const pending = await invite(pendingLobby.id);
    const unaffected = await invite(pendingLobby.id, other);
    await caller(guest).social.removeFriend({ userId: host });
    expect(
      (await caller().preparation.get({ id: one.id })).guestUserId,
    ).toBeNull();
    expect(
      (await caller(guest).preparation.get({ id: two.id })).guestUserId,
    ).toBeNull();
    expect(await accept(pending.id)).toMatchObject({ status: "cancelled" });
    expect(
      (await caller(other).social.getInvitations()).find(
        (item) => item.id === unaffected.id,
      )?.status,
    ).toBe("pending");
    await befriend();
    await accept((await invite(one.id)).id);
    const blocked = await invite(pendingLobby.id);
    await caller().social.block({ userId: guest });
    expect(
      (await caller().preparation.get({ id: one.id })).guestUserId,
    ).toBeNull();
    expect(await accept(blocked.id)).toMatchObject({ status: "cancelled" });
    await expect(invite(one.id)).rejects.toThrow("friendship");
  });
});
