import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import seedrandom from "seedrandom";
import { Goblin } from "../apps/game/src/enemies/goblin";
import { rollDungeonRoute, routeEncounterCatalog } from "../apps/game/src/dungeons/route-catalog";
import * as schema from "../apps/server/src/db/schema";
import { equipEquipment, equipPassiveSkill, unequipEquipment } from "../apps/server/src/game-usecases/character";
import { beginDungeonAttempt } from "../apps/server/src/game-usecases/dungeon-attempt";
import { chooseDungeonPath } from "../apps/server/src/game-usecases/dungeon-route";
import { dungeonManager } from "../apps/server/src/game-usecases/dungeon-manager";
import { LootManager } from "../apps/server/src/game-usecases/loot-manager";
import { SyncFactory } from "../apps/server/src/game-usecases/sync-factory";
import { registerRecipes } from "../apps/server/src/lib/superjson-recipes";
import { connection, verifyConnection } from "./database-target";

registerRecipes();
const owner = "proof-owner";
const hero = "proof-hero";
const dungeon = "proof-dungeon";

export async function proveConcurrency(target: URL, database: string) {
  const control = connection(target, database, "loot-proof-control");
  const peers = [0, 1].map((index) => connection(target, database, `loot-proof-peer-${index}`));
  const db = drizzle(control);
  const clients = peers.map((peer) => drizzle(peer));
  const observations: { scenario: string; waitingConnections: number; results: string[] }[] = [];
  try {
    const identities = await Promise.all(peers.map((peer) => verifyConnection(peer, database)));
    assert.equal(new Set(identities.map((identity) => identity.pid)).size, 2, "Operations must use independent PostgreSQL backends");

    async function seed() {
      await control.unsafe(`TRUNCATE TABLE "user", team, character, spell_stats, passive_skill_stats, equipment_stats,
        dungeon_data, dungeon_participant, dungeon_enemy, dungeon_battle, battle_start, battle_participants,
        active_battle, battle_result, loot CASCADE`);
      await db.insert(schema.TB_user).values({ id: owner, username: "production-proof" });
      await db.insert(schema.TB_character).values({ id: hero, userId: owner, name: "Proof hero", health: 100, mana: 50, intelligence: 20, vitality: 10, strength: 18, agility: 100 });
      await db.insert(schema.TB_dungeonData).values({ id: dungeon, key: "dungeon1", createdBy: owner, characterData: [{ characterId: hero, health: 37, mana: 9 }] });
      await db.insert(schema.TB_dungeonParticipant).values({ dungeonId: dungeon, characterId: hero });
      await db.insert(schema.TB_dungeonEnemy).values([0, 1].map((round) => ({ id: `proof-goblin-${round}`, dungeonId: dungeon, type: "goblin" as const, inRound: round })));
    }

    async function contend(
      scenario: string,
      lock: "dungeon_data" | "loot" | "character",
      id: string,
      operations: ((client: (typeof clients)[number]) => Promise<unknown>)[],
    ) {
      let pending: Promise<PromiseSettledResult<unknown>[]> = Promise.resolve([]);
      await control.begin(async (tx) => {
        await tx.unsafe(`SELECT id FROM "${lock}" WHERE id = $1 FOR UPDATE`, [id]);
        pending = Promise.allSettled(operations.map((operation, index) => operation(clients[index]!)));
        // Observe both independent backends waiting on the held row. This proves
        // real lock contention, not merely two promises serialized by one pool.
        for (let attempt = 0; attempt < 300; attempt++) {
          await tx.unsafe("SELECT pg_stat_clear_snapshot()");
          const [waiting] = await tx.unsafe(`SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE datname = $1 AND application_name IN ('loot-proof-peer-0', 'loot-proof-peer-1')
              AND wait_event_type = 'Lock'`, [database]);
          if (waiting?.count === 2) return;
          await tx.unsafe("SELECT pg_sleep(0.01)");
        }
        throw new Error(`Did not observe both backends contending: ${scenario}`);
      });
      const results = await pending;
      observations.push({ scenario, waitingConnections: 2, results: results.map((result) => result.status) });
      return results;
    }

    await seed();
    const starts = await contend("overlapping dungeon starts", "dungeon_data", dungeon,
      [0, 1].map(() => (client) => beginDungeonAttempt(dungeon, owner, client)));
    assert.equal(starts.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal((await db.select().from(schema.TB_dungeonBattle)).length, 1);
    assert.equal((await db.select().from(schema.TB_battleStart)).length, 1);

    await seed();
    const route = rollDungeonRoute(2, seedrandom("production-proof"), routeEncounterCatalog.filter((entry) => entry.actions.includes("restore-health")));
    await db.update(schema.TB_dungeonData).set({ round: 1, route, characterData: [{ characterId: hero, health: 10, mana: 9 }] }).where(eq(schema.TB_dungeonData.id, dungeon));
    const choice = () => (client: (typeof clients)[number]) => chooseDungeonPath(dungeon, 1, route.forks[0]!.offers[0]!.id, "restore-health", owner, client);
    const choiceAndStart = await contend("route choice versus battle start", "dungeon_data", dungeon,
      [choice(), (client) => beginDungeonAttempt(dungeon, owner, client)]);
    assert.equal(choiceAndStart[0]!.status, "fulfilled");
    const started = choiceAndStart[1];
    const battleId = started?.status === "fulfilled" ? String(started.value) : await beginDungeonAttempt(dungeon, owner, db);
    const [run] = await db.select().from(schema.TB_dungeonData);
    assert.equal(run!.route!.decisions.length, 1);
    assert.equal(run!.characterData[0]!.health, 40);
    assert.equal((await new SyncFactory(db).get(battleId)).characters[0]!.health, 40, "Frozen build must include the committed shrine recovery");
    assert.equal((await db.select().from(schema.TB_dungeonBattle)).length, 1);

    await seed();
    const completedBattle = await beginDungeonAttempt(dungeon, owner, db);
    const completions = await contend("duplicate completion and rewards", "dungeon_data", dungeon,
      [0, 1].map(() => (client) => dungeonManager.handleDungeonCleared(dungeon, completedBattle, [new Goblin("proof-goblin-0")], [{ id: hero, health: 37, mana: 9, dead: false }], "TEAM_A", client)));
    assert(completions.every((result) => result.status === "fulfilled"));
    assert.equal((await db.select().from(schema.TB_dungeonData))[0]!.round, 1);
    assert.equal((await db.select().from(schema.TB_character))[0]!.xp, new Goblin("proof").xp);
    assert.equal((await db.select().from(schema.TB_loot)).length, 1);
    assert((await db.select().from(schema.TB_dungeonBattle))[0]!.completedAt);

    await seed();
    await db.insert(schema.TB_loot).values({ id: "proof-loot", battleId: "proof-reward", userId: owner, gold: 0, items: [{ type: "ITEM", dropRate: 1, data: { itemType: "iron-sword" } }] });
    const claims = await contend("duplicate inventory claims", "loot", "proof-loot",
      [0, 1].map(() => (client) => new LootManager(owner, client).claim("proof-loot")));
    assert.equal(claims.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal((await db.select().from(schema.TB_loot)).length, 0);
    assert.equal((await db.select().from(schema.TB_equipmentStats)).length, 1);

    await seed();
    await db.insert(schema.TB_equipmentStats).values([
      { id: "proof-sword", userId: owner, type: "iron-sword" },
      { id: "proof-staff", userId: owner, type: "oakwarden-staff" },
    ]);
    const equips = await contend("simultaneous weapon replacements", "character", hero,
      ["proof-sword", "proof-staff"].map((item) => (client) => equipEquipment(hero, item, owner, client)));
    assert(equips.every((result) => result.status === "fulfilled"));
    assert.equal((await db.select().from(schema.TB_equipmentStats).where(eq(schema.TB_equipmentStats.equippedBy, hero))).length, 1);
    await seed();
    await db.insert(schema.TB_character).values(["a", "B"].map((id) => ({ id, userId: owner, name: id, health: 100, mana: 50, intelligence: 20, vitality: 10, strength: 18, agility: 100 })));
    await db.delete(schema.TB_dungeonParticipant);
    await db.insert(schema.TB_dungeonParticipant).values(["a", "B"].map((characterId) => ({ dungeonId: dungeon, characterId })));
    await db.update(schema.TB_dungeonData).set({ characterData: ["a", "B"].map((characterId) => ({ characterId, health: 37, mana: 9 })) });
    await db.insert(schema.TB_passivSkillStats).values({ id: "proof-passive", type: "armor-up", userId: owner, equippedBy: "a" });
    assert(identities.every((identity) => identity.collation === "C"), "Mixed-case lock proof must run under explicit C collation");
    const mixed = await contend("mixed-case party snapshot versus passive transfer", "character", "B", [
      (client) => beginDungeonAttempt(dungeon, owner, client),
      (client) => equipPassiveSkill("B", "proof-passive", owner, client),
    ]);
    assert(mixed.every((result) => result.status === "fulfilled"));
    const mixedBattleId = mixed[0]!.status === "fulfilled" ? String(mixed[0]!.value) : "";
    const savedParty = (await new SyncFactory(db).get(mixedBattleId)).characters;
    assert.equal(savedParty.flatMap((character) => character.passiveSkills).length, 1, "Snapshot contains the passive exactly once across either complete party build");
    assert.equal((await db.select().from(schema.TB_passivSkillStats))[0]!.equippedBy, "B");

    await seed();
    await db.insert(schema.TB_equipmentStats).values({ id: "proof-sword", type: "iron-sword", userId: owner, equippedBy: hero });
    const unequip = await contend("equipment removal versus frozen snapshot", "character", hero, [
      (client) => beginDungeonAttempt(dungeon, owner, client),
      (client) => unequipEquipment("proof-sword", owner, client),
    ]);
    assert(unequip.every((result) => result.status === "fulfilled"));
    const unequipBattleId = unequip[0]!.status === "fulfilled" ? String(unequip[0]!.value) : "";
    const frozenWeapon = (await new SyncFactory(db).get(unequipBattleId)).characters[0]!.equipped.WEAPON;
    assert(!frozenWeapon || frozenWeapon.id === "proof-sword");
    assert.equal((await db.select().from(schema.TB_equipmentStats))[0]!.equippedBy, null);

    await seed();
    const firstBattle = await beginDungeonAttempt(dungeon, owner, db);
    const otherDungeon = "proof-other-dungeon";
    await db.insert(schema.TB_dungeonData).values({ id: otherDungeon, key: "dungeon1", createdBy: owner, characterData: [{ characterId: hero, health: 37, mana: 9 }] });
    await db.insert(schema.TB_dungeonParticipant).values({ dungeonId: otherDungeon, characterId: hero });
    await db.insert(schema.TB_dungeonEnemy).values({ id: "proof-other-goblin", dungeonId: otherDungeon, type: "goblin", inRound: 0 });
    const secondBattle = await beginDungeonAttempt(otherDungeon, owner, db);
    const xp = await contend("concurrent completions in different runs preserve both XP grants", "character", hero,
      [[dungeon, firstBattle], [otherDungeon, secondBattle]].map(([run, battle]) => (client) =>
        dungeonManager.handleDungeonCleared(run!, battle!, [new Goblin("proof")], [{ id: hero, health: 37, mana: 9, dead: false }], "TEAM_A", client)));
    assert(xp.every((result) => result.status === "fulfilled"));
    assert.equal((await db.select().from(schema.TB_character))[0]!.xp, 2 * new Goblin("proof").xp);
    assert.equal((await db.select().from(schema.TB_loot)).length, 2);
    assert((await db.select().from(schema.TB_dungeonData)).every((run) => run.round === 1 && !run.activeBattle));
    return { backendPids: identities.map((identity) => identity.pid), collation: identities[0]!.collation, observations };
  } finally {
    await Promise.all([...peers, control].map((sql) => sql.end({ timeout: 5 })));
  }
}
