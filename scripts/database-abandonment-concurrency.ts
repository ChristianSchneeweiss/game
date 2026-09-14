import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { BM } from "../apps/game/src/bm";
import {
  castBattleSpell,
  getBattleTargets,
} from "../apps/server/src/battle/commands";
import * as schema from "../apps/server/src/db/schema";
import { abandonDungeon } from "../apps/server/src/game-usecases/dungeon-abandon";
import { bmStorage } from "../apps/server/src/game-usecases/bm-storage";
import { dungeonManager } from "../apps/server/src/game-usecases/dungeon-manager";
import { reconcilePreparationPresence } from "../apps/server/src/game-usecases/shared-preparation-presence";
import { SyncFactory } from "../apps/server/src/game-usecases/sync-factory";
import type { Context } from "../apps/server/src/lib/context";
import { registerRecipes } from "../apps/server/src/lib/superjson-recipes";
import { appRouter } from "../apps/server/src/routers";
import { connection, verifyConnection } from "./database-target";

registerRecipes();
const host = "abandon-host";
const guest = "abandon-guest";
const hero = "abandon-hero-a";
const friendHero = "abandon-hero-b";

/** Real PostgreSQL sessions exercise the same preparation API and settlement
 * boundary as production. Active abandonment assumes the DO has frozen combat;
 * durable journal ordering is separately proved by the transport tests. */
export async function proveAbandonmentConcurrency(
  target: URL,
  database: string,
) {
  const control = connection(target, database, "loot-abandon-control");
  const peers = [0, 1].map((index) =>
    connection(target, database, `loot-abandon-peer-${index}`),
  );
  const db = drizzle(control);
  const clients = peers.map((peer) => drizzle(peer));
  type Client = (typeof clients)[number];
  const caller = (client: Client, userId: string) =>
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
      await control.unsafe(`TRUNCATE TABLE "user", team, character, spell_stats, passive_skill_stats, equipment_stats,
        dungeon_data, dungeon_participant, dungeon_enemy, dungeon_battle, battle_start, battle_participants,
        active_battle, battle_result, loot CASCADE`);
      await db.insert(schema.TB_user).values([
        { id: host, username: "abandonment-host" },
        { id: guest, username: "abandonment-guest" },
      ]);
      await db.insert(schema.TB_character).values(
        [
          { id: hero, userId: host },
          { id: friendHero, userId: guest },
        ].map((character) => ({
          ...character,
          name: character.id,
          health: 2000,
          mana: 1000,
          intelligence: 200,
          vitality: 200,
          strength: 200,
          agility: 100,
          level: 20,
        })),
      );
      const request = await caller(db, host).social.sendRequest({
        userId: guest,
      });
      await caller(db, guest).social.respondRequest({
        requestId: request.id,
        accept: true,
      });
    }

    async function sharedRun() {
      const { id } = await caller(db, host).preparation.create({
        key: "trial-of-the-nature",
        branching: false,
      });
      const invitation = await caller(db, host).social.invite({
        lobbyId: id,
        userId: guest,
      });
      await caller(db, guest).social.respondInvitation({
        invitationId: invitation.id,
        accept: true,
      });
      await caller(db, host).preparation.selectCharacter({
        id,
        characterId: hero,
      });
      await caller(db, guest).preparation.selectCharacter({
        id,
        characterId: friendHero,
      });
      await reconcilePreparationPresence(
        id,
        [
          { userId: host, connectionId: `${id}:host` },
          { userId: guest, connectionId: `${id}:guest` },
        ],
        db,
      );
      for (const userId of [host, guest]) {
        const preparation = await caller(db, userId).preparation.get({ id });
        await caller(db, userId).preparation.ready({
          id,
          ready: true,
          expectedRevision: preparation.revision,
          expectedBuildRevision: preparation.participants.find(
            (player) => player.userId === userId,
          )!.buildRevision,
        });
      }
      const preparation = await caller(db, host).preparation.get({ id });
      return caller(db, host).preparation.start({
        id,
        expectedRevision: preparation.revision,
      });
    }

    async function settlement(
      run: { dungeonId: string; battleId: string },
      health = 1500,
    ) {
      const frozen = await new SyncFactory(db).get(run.battleId);
      const survivors = frozen.characters.map((character) => ({
        id: character.id,
        health,
        mana: 700,
        dead: false,
      }));
      const complete = (client: Client) =>
        dungeonManager.handleDungeonCleared(
          run.dungeonId,
          run.battleId,
          frozen.enemies,
          survivors,
          "TEAM_A",
          client,
        );
      return {
        complete,
        xp: frozen.enemies.reduce((total, enemy) => total + enemy.xp, 0),
      };
    }

    async function contend(
      scenario: string,
      table: "dungeon_data" | "character",
      id: string,
      operations: ((client: Client) => Promise<unknown>)[],
      ordered = false,
    ) {
      let pending: Promise<PromiseSettledResult<unknown>[]> = Promise.resolve(
        [],
      );
      await control.begin(async (tx) => {
        await tx.unsafe(`SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`, [
          id,
        ]);
        async function observe(count: number) {
          for (let attempt = 0; attempt < 300; attempt++) {
            await tx.unsafe("SELECT pg_stat_clear_snapshot()");
            const [waiting] = await tx.unsafe(
              `SELECT count(*)::int AS count FROM pg_stat_activity
              WHERE datname = $1 AND application_name IN ('loot-abandon-peer-0', 'loot-abandon-peer-1')
              AND wait_event_type = 'Lock'`,
              [database],
            );
            if (waiting?.count === count) return;
            await tx.unsafe("SELECT pg_sleep(0.01)");
          }
          throw new Error(
            `Did not observe ${count} independent backends contending: ${scenario}`,
          );
        }
        // Queue one writer first when proving each direction of a race; both
        // remain blocked until the held row is released by this transaction.
        const first = Promise.allSettled([operations[0]!(clients[0]!)]);
        if (ordered) await observe(1);
        const second = Promise.allSettled([operations[1]!(clients[1]!)]);
        pending = Promise.all([first, second]).then((groups) => groups.flat());
        await observe(2);
      });
      const results = await pending;
      observations.push({
        scenario,
        waitingConnections: 2,
        results: results.map((result) => result.status),
      });
      assert(
        results.every((result) => result.status === "fulfilled"),
        JSON.stringify(results),
      );
      return results;
    }

    for (const completionFirst of [true, false]) {
      await seed();
      const run = await sharedRun();
      const { complete, xp } = await settlement(run);
      const abandon = (client: Client) =>
        abandonDungeon(run.dungeonId, guest, client, {
          allowActiveBattle: true,
        });
      await contend(
        completionFirst
          ? "completion before abandonment retains both personal rewards"
          : "abandonment before completion refuses late rewards",
        "dungeon_data",
        run.dungeonId,
        completionFirst ? [complete, abandon] : [abandon, complete],
        true,
      );
      const view = await caller(db, guest).dungeon.getRun({
        id: run.dungeonId,
      });
      assert(view.abandonedAt);
      assert.equal(view.activeBattle, false);
      assert.equal(view.round, completionFirst ? 1 : 0);
      assert.equal(view.loot.length, completionFirst ? 1 : 0);
      assert.equal(
        (await db.select().from(schema.TB_loot)).length,
        completionFirst ? 2 : 0,
      );
      assert(
        (await db.select().from(schema.TB_character)).every(
          (character) => character.xp === (completionFirst ? xp : 0),
        ),
      );
      const originalRewards = await db.select().from(schema.TB_loot);
      const repeated = await caller(db, host).dungeon.abandon({
        id: run.dungeonId,
      });
      assert.equal(repeated.abandonedAt.getTime(), view.abandonedAt.getTime());
      await complete(clients[0]!);
      assert.deepEqual(await db.select().from(schema.TB_loot), originalRewards);
      await assert.rejects(
        caller(clients[0]!, host).dungeon.fightDungeon({ id: run.dungeonId }),
      );
      if (completionFirst) {
        await caller(db, guest).claimLoot(view.loot[0]!.id);
        assert.equal(
          (await caller(db, guest).dungeon.getRun({ id: run.dungeonId })).loot
            .length,
          0,
        );
        assert.equal(
          (await caller(db, host).dungeon.getRun({ id: run.dungeonId })).loot
            .length,
          1,
        );
      }
    }

    await seed();
    const completed = await sharedRun();
    const snapshot = await new SyncFactory(db).get(completed.battleId);
    const bm = new BM(
      [...snapshot.characters, ...snapshot.enemies],
      completed.battleId,
    );
    const originalLog = console.log;
    try {
      // This synchronous fixture emits a line for every hit. Keep the rehearsal
      // evidence focused on observed transactions; restore logging before I/O.
      console.log = () => {};
      bm.start();
      for (let turn = 0; !bm.isGameOver() && turn < 300; turn++) {
        const character = bm.getEntityById(
          bm.getCurrentRound().orderQueue[0]!,
        )!;
        const attack = character.spells.find(
          (spell) => spell.config.type === "basic-attack",
        )!;
        const command = { entityId: character.id, spellId: attack.config.id };
        const targets = getBattleTargets(bm, command);
        castBattleSpell(
          bm,
          {
            ...command,
            targetIds: targets.automatic
              ? targets.targets
              : [targets.targets[0]!],
          },
          character.id === hero ? host : guest,
        );
      }
    } finally {
      console.log = originalLog;
    }
    assert.equal(bm.getWinningTeam(), "TEAM_A");
    await bmStorage.save(bm, db);
    const savedSettlement = await settlement(completed);
    await contend(
      "saved victory settles once even when abandonment reaches the lock before delivery",
      "dungeon_data",
      completed.dungeonId,
      [
        (client) =>
          abandonDungeon(completed.dungeonId, guest, client, {
            allowActiveBattle: true,
          }),
        savedSettlement.complete,
      ],
      true,
    );
    assert.equal((await db.select().from(schema.TB_loot)).length, 2);
    const savedRun = await caller(db, guest).dungeon.getRun({
      id: completed.dungeonId,
    });
    assert(savedRun.abandonedAt);
    assert.equal(savedRun.round, 1);
    assert((await db.select().from(schema.TB_dungeonBattle))[0]!.completedAt);
    assert.equal(
      (await caller(db, guest).getBattle(completed.battleId)).winner,
      "TEAM_A",
    );

    await seed();
    const runs = [await sharedRun(), await sharedRun()];
    const settlements = await Promise.all(
      runs.map((run, index) => settlement(run, 1200 + index * 100)),
    );
    await contend(
      "concurrent shared completions retain both owners' XP and separate run resources",
      "character",
      hero,
      settlements.map((settled) => settled.complete),
    );
    const totalXp = settlements.reduce(
      (total, settled) => total + settled.xp,
      0,
    );
    assert(
      (await db.select().from(schema.TB_character)).every(
        (character) => character.xp === totalXp,
      ),
    );
    assert.equal((await db.select().from(schema.TB_loot)).length, 4);
    const records = await db.select().from(schema.TB_dungeonData);
    for (const [index, run] of runs.entries()) {
      const record = records.find((record) => record.id === run.dungeonId)!;
      assert.equal(record.round, 1);
      assert(
        record.characterData.every(
          (character) => character.health === 1200 + index * 100,
        ),
      );
    }
    await contend(
      "duplicate shared completion cannot grant extra XP or personal loot",
      "dungeon_data",
      runs[0]!.dungeonId,
      [settlements[0]!.complete, settlements[0]!.complete],
    );
    assert(
      (await db.select().from(schema.TB_character)).every(
        (character) => character.xp === totalXp,
      ),
    );
    assert.equal((await db.select().from(schema.TB_loot)).length, 4);
    await caller(db, guest).dungeon.abandon({ id: runs[0]!.dungeonId });
    const [other] = await db
      .select()
      .from(schema.TB_dungeonData)
      .where(eq(schema.TB_dungeonData.id, runs[1]!.dungeonId));
    assert.equal(other!.abandonedAt, null);
    assert.equal(other!.round, 1);
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
