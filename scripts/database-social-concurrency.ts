import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../apps/server/src/db/schema";
import {
  reconcilePreparationPresence,
  setPreparationConnected,
} from "../apps/server/src/game-usecases/shared-preparation-presence";
import { SyncFactory } from "../apps/server/src/game-usecases/sync-factory";
import type { Context } from "../apps/server/src/lib/context";
import { registerRecipes } from "../apps/server/src/lib/superjson-recipes";
import { appRouter } from "../apps/server/src/routers";
import { connection, verifyConnection } from "./database-target";

registerRecipes();
const host = "social-proof-host";
const guest = "social-proof-guest";
const other = "social-proof-other";
const hostHero = "social-proof-host-hero";
const guestHero = "social-proof-guest-hero";

/** Runs only inside the rehearsal's disposable, schema-backed database. */
export async function proveSocialConcurrency(target: URL, database: string) {
  const control = connection(target, database, "loot-social-control");
  const peers = [0, 1].map((index) =>
    connection(target, database, `loot-social-peer-${index}`),
  );
  const db = drizzle(control);
  const clients = peers.map((peer) => drizzle(peer));
  type Client = (typeof clients)[number];
  const caller = (client = db, userId = host) =>
    appRouter.createCaller({
      db: client,
      session: { id: userId },
    } as unknown as Context);
  const observations: {
    scenario: string;
    waitingConnections: number;
    results: string[];
  }[] = [];

  try {
    const identities = await Promise.all(
      peers.map((peer) => verifyConnection(peer, database)),
    );
    assert.equal(new Set(identities.map((identity) => identity.pid)).size, 2);

    async function seed() {
      await control.unsafe(`TRUNCATE TABLE "user", team, battle_start, battle_result,
        battle_participants, active_battle CASCADE`);
      await db
        .insert(schema.TB_user)
        .values([host, guest, other].map((id) => ({ id, username: id })));
      await db.insert(schema.TB_character).values(
        [
          { id: hostHero, userId: host },
          { id: guestHero, userId: guest },
        ].map((hero) => ({
          ...hero,
          name: hero.id,
          health: 100,
          mana: 50,
          intelligence: 20,
          vitality: 10,
          strength: 18,
          agility: 100,
        })),
      );
      for (const friend of [guest, other]) {
        const request = await caller().social.sendRequest({ userId: friend });
        await caller(db, friend).social.respondRequest({
          requestId: request.id,
          accept: true,
        });
      }
    }

    async function prepare() {
      return caller().preparation.create({
        key: "trial-of-the-nature",
        branching: false,
      });
    }

    async function invite(lobbyId: string, userId = guest) {
      return caller().social.invite({ lobbyId, userId });
    }

    async function readyInput(id: string, userId = host) {
      const preparation = await caller(db, userId).preparation.get({ id });
      return {
        id,
        ready: true,
        expectedRevision: preparation.revision,
        expectedBuildRevision:
          preparation.participants.find(
            (participant) => participant.userId === userId,
          )?.buildRevision ?? null,
      };
    }

    async function readyPair() {
      const preparation = await prepare();
      const invitation = await invite(preparation.id);
      await caller(db, guest).social.respondInvitation({
        invitationId: invitation.id,
        accept: true,
      });
      await caller().preparation.selectCharacter({
        id: preparation.id,
        characterId: hostHero,
      });
      await caller(db, guest).preparation.selectCharacter({
        id: preparation.id,
        characterId: guestHero,
      });
      // Presence is the existing authenticated transport boundary; all player
      // relationship, selection, readiness and start commands use the API.
      for (const userId of [host, guest]) {
        await setPreparationConnected(
          preparation.id,
          userId,
          `connection-${userId}`,
          true,
          db,
        );
      }
      for (const userId of [host, guest]) {
        await caller(db, userId).preparation.ready(
          await readyInput(preparation.id, userId),
        );
      }
      return caller().preparation.get({ id: preparation.id });
    }

    async function contend(
      scenario: string,
      table: "user" | "preparation" | "character",
      id: string,
      operations: [
        (client: Client) => Promise<unknown>,
        (client: Client) => Promise<unknown>,
      ],
    ) {
      const pending: Promise<PromiseSettledResult<unknown>>[] = [];
      try {
        await control.begin(async (tx) => {
          await tx.unsafe(
            `SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`,
            [id],
          );
          // Observe each queued operation before launching the next so both
          // serial orders can be rehearsed, rather than relying on pool timing.
          for (let index = 0; index < operations.length; index++) {
            pending.push(
              operations[index]!(clients[index]!).then(
                (value) => ({ status: "fulfilled" as const, value }),
                (reason) => ({ status: "rejected" as const, reason }),
              ),
            );
            let observed = false;
            for (let attempt = 0; attempt < 300; attempt++) {
              await tx.unsafe("SELECT pg_stat_clear_snapshot()");
              const [waiting] = await tx.unsafe(
                `SELECT count(*)::int AS count FROM pg_stat_activity
                WHERE datname = $1 AND application_name IN ('loot-social-peer-0', 'loot-social-peer-1')
                  AND wait_event_type = 'Lock'`,
                [database],
              );
              if (waiting?.count === index + 1) {
                observed = true;
                break;
              }
              await tx.unsafe("SELECT pg_sleep(0.01)");
            }
            assert(
              observed,
              `Independent connections did not contend: ${scenario}`,
            );
          }
        });
      } catch (error) {
        await Promise.all(pending);
        throw error;
      }
      const results = await Promise.all(pending);
      observations.push({
        scenario,
        waitingConnections: 2,
        results: results.map((result) => result.status),
      });
      return results;
    }

    await seed();
    const lobby = await prepare();
    const invitations = await Promise.all([
      invite(lobby.id),
      invite(lobby.id, other),
    ]);
    const separateLobby = await prepare();
    const separateInvite = await invite(separateLobby.id, other);
    const accepted = await contend(
      "competing invitations admit one guest",
      "preparation",
      lobby.id,
      [
        (client) =>
          caller(client, guest).social.respondInvitation({
            invitationId: invitations[0]!.id,
            accept: true,
          }),
        (client) =>
          caller(client, other).social.respondInvitation({
            invitationId: invitations[1]!.id,
            accept: true,
          }),
      ],
    );
    assert(accepted.every((result) => result.status === "fulfilled"));
    const inbox = await caller().social.getInvitations();
    assert.equal(
      inbox.filter(
        (item) => item.lobbyId === lobby.id && item.status === "accepted",
      ).length,
      1,
    );
    assert.equal(
      inbox.filter(
        (item) => item.lobbyId === lobby.id && item.status === "unavailable",
      ).length,
      1,
    );
    assert.equal(
      inbox.find((item) => item.id === separateInvite.id)?.status,
      "pending",
    );
    assert.equal(
      (await caller().preparation.get({ id: lobby.id })).participants.length,
      2,
    );

    for (const change of ["remove", "block", "close"] as const) {
      for (const first of ["accept", "change"] as const) {
        await seed();
        const preparation = await prepare();
        const invitation = await invite(preparation.id);
        const accept = (client: Client) =>
          caller(client, guest).social.respondInvitation({
            invitationId: invitation.id,
            accept: true,
          });
        const alter = (client: Client) =>
          change === "remove"
            ? caller(client).social.removeFriend({ userId: guest })
            : change === "block"
              ? caller(client).social.block({ userId: guest })
              : caller(client).preparation.leave({ id: preparation.id });
        const results = await contend(
          `invitation acceptance versus ${change}, ${first} queued first`,
          change === "close" ? "preparation" : "user",
          change === "close" ? preparation.id : host,
          first === "accept" ? [accept, alter] : [alter, accept],
        );
        assert(results.every((result) => result.status === "fulfilled"));
        const current = await caller().preparation.get({ id: preparation.id });
        if (change === "close") assert(current.closedAt);
        else {
          assert.equal(current.guestUserId, null);
          assert.equal(
            (await caller().social.getFriends()).friends.some(
              (friend) => friend.id === guest,
            ),
            false,
          );
        }
        const replay = await caller(db, guest).social.respondInvitation({
          invitationId: invitation.id,
          accept: true,
        });
        assert.notEqual(replay.status, "pending");
        const afterReplay = await caller().preparation.get({
          id: preparation.id,
        });
        assert.equal(afterReplay.guestUserId, current.guestUserId);
        assert.equal(
          afterReplay.closedAt?.getTime(),
          current.closedAt?.getTime(),
        );
      }
    }

    await seed();
    const duplicate = await readyPair();
    const duplicateStarts = await contend(
      "duplicate shared encounter starts",
      "preparation",
      duplicate.id,
      [
        (client) =>
          caller(client).preparation.start({
            id: duplicate.id,
            expectedRevision: duplicate.revision,
          }),
        (client) =>
          caller(client).preparation.start({
            id: duplicate.id,
            expectedRevision: duplicate.revision,
          }),
      ],
    );
    assert.equal(
      duplicateStarts.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal((await db.select().from(schema.TB_dungeonBattle)).length, 1);
    assert.equal((await db.select().from(schema.TB_battleStart)).length, 1);

    for (const first of ["start", "invalidation"] as const) {
      await seed();
      await db
        .insert(schema.TB_equipmentStats)
        .values({ id: "social-proof-sword", userId: host, type: "iron-sword" });
      const preparation = await readyPair();
      const start = (client: Client) =>
        caller(client).preparation.start({
          id: preparation.id,
          expectedRevision: preparation.revision,
        });
      const equip = (client: Client) =>
        caller(client).character.equipEquipment({
          characterId: hostHero,
          equipmentId: "social-proof-sword",
        });
      const results = await contend(
        `shared start versus build invalidation, ${first} queued first`,
        "character",
        hostHero,
        first === "start" ? [start, equip] : [equip, start],
      );
      const startResult = results[first === "start" ? 0 : 1]!;
      assert.equal(results[first === "start" ? 1 : 0]!.status, "fulfilled");
      assert.equal(
        startResult.status,
        first === "start" ? "fulfilled" : "rejected",
      );
      const attempts = await db.select().from(schema.TB_dungeonBattle);
      assert.equal(attempts.length, first === "start" ? 1 : 0);
      assert.equal(
        (
          await caller().preparation.get({ id: preparation.id })
        ).participants.find((player) => player.userId === host)?.ready,
        false,
      );
      if (attempts[0]) {
        const snapshot = await new SyncFactory(db).get(attempts[0].battleId);
        assert.equal(
          snapshot.characters.find((hero) => hero.id === hostHero)?.equipped
            .WEAPON,
          undefined,
          "The active battle must retain its pre-edit frozen build",
        );
      } else {
        assert.equal(
          (await db.select().from(schema.TB_dungeonData)).length,
          0,
          "A rejected start must roll back its new run",
        );
        await caller().preparation.ready(await readyInput(preparation.id));
        const current = await caller().preparation.get({ id: preparation.id });
        const restarted = await caller().preparation.start({
          id: preparation.id,
          expectedRevision: current.revision,
        });
        assert.equal(
          (await new SyncFactory(db).get(restarted.battleId)).characters.find(
            (hero) => hero.id === hostHero,
          )?.equipped.WEAPON?.id,
          "social-proof-sword",
        );
      }
    }

    for (const first of ["start", "disconnect"] as const) {
      await seed();
      const preparation = await readyPair();
      const start = (client: Client) =>
        caller(client).preparation.start({
          id: preparation.id,
          expectedRevision: preparation.revision,
        });
      const disconnect = (client: Client) =>
        setPreparationConnected(
          preparation.id,
          guest,
          `connection-${guest}`,
          false,
          client,
        );
      const results = await contend(
        `shared start versus disconnect, ${first} queued first`,
        "preparation",
        preparation.id,
        first === "start" ? [start, disconnect] : [disconnect, start],
      );
      assert.equal(results[first === "start" ? 1 : 0]!.status, "fulfilled");
      assert.equal(
        results[first === "start" ? 0 : 1]!.status,
        first === "start" ? "fulfilled" : "rejected",
      );
      assert.equal(
        (await db.select().from(schema.TB_dungeonBattle)).length,
        first === "start" ? 1 : 0,
      );
      const state = await caller().preparation.get({ id: preparation.id });
      assert.equal(
        state.participants.find((player) => player.userId === guest)?.ready,
        false,
      );
      assert.equal(
        state.participants.find((player) => player.userId === guest)?.connected,
        false,
      );
    }

    for (const change of ["build", "dungeon", "socket"] as const) {
      await seed();
      await db.insert(schema.TB_equipmentStats).values({
        id: "social-proof-sword",
        userId: host,
        type: "iron-sword",
      });
      const preparation = await readyPair();
      const displayedConsent = await readyInput(preparation.id);
      const invalidate = (client: Client) =>
        change === "build"
          ? caller(client).character.equipEquipment({
              characterId: hostHero,
              equipmentId: "social-proof-sword",
            })
          : change === "dungeon"
            ? caller(client).preparation.setDungeon({
                id: preparation.id,
                key: "trial-of-the-nature",
                branching: true,
              })
            : reconcilePreparationPresence(
                preparation.id,
                [
                  { userId: host, connectionId: `replacement-${host}` },
                  { userId: guest, connectionId: `connection-${guest}` },
                ],
                client,
              );
      const delayedReady = (client: Client) =>
        caller(client).preparation.ready(displayedConsent);
      const results = await contend(
        `delayed ready rejects consent displayed before ${change} change`,
        change === "build" ? "character" : "preparation",
        change === "build" ? hostHero : preparation.id,
        [invalidate, delayedReady],
      );
      assert.equal(results[0]!.status, "fulfilled");
      assert.equal(results[1]!.status, "rejected");
      const current = await caller().preparation.get({ id: preparation.id });
      assert.equal(
        current.participants.find((participant) => participant.userId === host)
          ?.ready,
        false,
      );
      if (change === "socket")
        assert.equal(
          current.participants.find(
            (participant) => participant.userId === host,
          )?.connected,
          true,
        );
      assert.equal((await db.select().from(schema.TB_dungeonBattle)).length, 0);
      await caller().preparation.ready(await readyInput(preparation.id));
      assert.equal(
        (
          await caller().preparation.get({ id: preparation.id })
        ).participants.find((participant) => participant.userId === host)
          ?.ready,
        true,
      );
    }

    return {
      backendPids: identities.map((identity) => identity.pid),
      observations,
    };
  } finally {
    await Promise.all(
      [...peers, control].map((sql) => sql.end({ timeout: 5 })),
    );
  }
}
