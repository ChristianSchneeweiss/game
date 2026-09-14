import { afterEach, beforeEach, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { BM } from "../../../apps/game/src/bm";
import {
  castBattleSpell,
  getBattleTargets,
} from "../../../apps/server/src/battle/commands";
import {
  TB_character,
  TB_dungeonBattle,
  TB_equipmentStats,
  TB_passivSkillStats,
  TB_spellStats,
  TB_user,
} from "../../../apps/server/src/db/schema";
import { TB_preparationConnection } from "../../../apps/server/src/db/shared-preparation-schema";
import { appRouter } from "../../../apps/server/src/routers";
import type { Context } from "../../../apps/server/src/lib/context";
import { registerRecipes } from "../../../apps/server/src/lib/superjson-recipes";
import {
  setPreparationConnected,
  reconcilePreparationPresence,
} from "../../../apps/server/src/game-usecases/shared-preparation-presence";
import { dungeonManager } from "../../../apps/server/src/game-usecases/dungeon-manager";
import { EntityFactory } from "../../../apps/server/src/game-usecases/entity-factory";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { bmStorage } from "../../../apps/server/src/game-usecases/bm-storage";
import { abandonDungeon } from "../../../apps/server/src/game-usecases/dungeon-abandon";
import { database, type TestDatabase } from "../support/database";

registerRecipes();
let data: TestDatabase;
const host = "audit-owner";
const guest = "friend-owner";
const third = "unrelated-owner";
const caller = (userId = host) =>
  appRouter.createCaller({
    db: data.db,
    session: { id: userId },
  } as unknown as Context);
beforeEach(async () => {
  data = await database();
  await data.db.insert(TB_user).values([
    { id: guest, username: "Friend" },
    { id: third, username: "Unrelated" },
  ]);
  await data.db.insert(TB_character).values([
    {
      id: "friend-hero",
      userId: guest,
      name: "Friend hero",
      health: 2000,
      mana: 1000,
      intelligence: 200,
      vitality: 200,
      strength: 200,
      agility: 90,
    },
    {
      id: "host-spare",
      userId: host,
      name: "Spare hero",
      health: 100,
      mana: 50,
      intelligence: 10,
      vitality: 10,
      strength: 10,
      agility: 10,
    },
  ]);
  await data.db
    .update(TB_character)
    .set({
      health: 2000,
      mana: 1000,
      intelligence: 200,
      vitality: 200,
      strength: 200,
      statPointsAvailable: 10,
    })
    .where(eq(TB_character.id, "audit-hero"));
  const request = await caller().social.sendRequest({ userId: guest });
  await caller(guest).social.respondRequest({
    requestId: request.id,
    accept: true,
  });
});
afterEach(async () => {
  await data.close();
});

async function lobby(branching = false) {
  const { id } = await caller().preparation.create({
    key: "trial-of-the-nature",
    branching,
  });
  const invite = await caller().social.invite({ lobbyId: id, userId: guest });
  await caller(guest).social.respondInvitation({
    invitationId: invite.id,
    accept: true,
  });
  await caller().preparation.selectCharacter({ id, characterId: "audit-hero" });
  await caller(guest).preparation.selectCharacter({
    id,
    characterId: "friend-hero",
  });
  await reconcilePreparationPresence(
    id,
    [
      { userId: host, connectionId: `${id}:host` },
      { userId: guest, connectionId: `${id}:guest` },
    ],
    data.db,
  );
  return id;
}
async function ready(id: string) {
  await readyOne(id);
  await readyOne(id, guest);
}
async function readyInput(id: string, userId = host, ready = true) {
  const preparation = await caller(userId).preparation.get({ id });
  return {
    id,
    ready,
    expectedRevision: preparation.revision,
    expectedBuildRevision: preparation.participants.find(
      (player) => player.userId === userId,
    )!.buildRevision,
  };
}
async function readyOne(id: string, userId = host) {
  return caller(userId).preparation.ready(await readyInput(id, userId));
}
async function start(id: string, userId = host) {
  const preparation = await caller(userId).preparation.get({ id });
  return caller(userId).preparation.start({
    id,
    expectedRevision: preparation.revision,
  });
}
async function fight(id: string, userId = host) {
  const run = await caller(userId).dungeon.getRun({ id });
  return caller(userId).dungeon.fightDungeon({
    id,
    expectedRevision: run.shared?.revision,
  });
}
async function outcome(battleId: string) {
  const snapshot = await new SyncFactory(data.db).get(battleId);
  const bm = new BM([...snapshot.characters, ...snapshot.enemies], battleId);
  bm.start();
  for (let turn = 0; !bm.isGameOver() && turn < 300; turn++) {
    const hero = bm.getEntityById(bm.getCurrentRound().orderQueue[0]!)!;
    const spell =
      hero.spells.find(
        (spell) =>
          spell.config.type === "bladestorm-rhythm" && spell.canCast(hero),
      ) ?? hero.spells.find((spell) => spell.config.type === "basic-attack")!;
    const command = { entityId: hero.id, spellId: spell.config.id };
    const targets = getBattleTargets(bm, command);
    castBattleSpell(
      bm,
      {
        ...command,
        targetIds: targets.automatic ? targets.targets : [targets.targets[0]!],
      },
      hero.id === "audit-hero" ? host : guest,
    );
  }
  expect(bm.getWinningTeam()).toBe("TEAM_A");
  await bmStorage.save(bm, data.db);
  return bmStorage.get(battleId, data.db);
}
async function settle(dungeonId: string, battleId: string) {
  const result = await outcome(battleId);
  await dungeonManager.handleDungeonCleared(
    dungeonId,
    battleId,
    result.teamB
      .filter((enemy) => enemy.dead)
      .map((enemy) => EntityFactory.createEnemyFromType(enemy.type, enemy.id)),
    result.teamA,
    result.winner,
    data.db,
  );
  return result;
}

test("the authenticated entry boundary requires owned characters and shared invitation consent", async () => {
  await expect(
    caller().dungeon.enterDungeon({
      key: "dungeon1",
      characters: ["audit-hero", "friend-hero"],
    }),
  ).rejects.toThrow("own characters");
  const solo = await caller().dungeon.enterDungeon({
    key: "dungeon1",
    characters: ["audit-hero", "host-spare"],
  });
  expect(solo.playerTeam).toHaveLength(2);
  const id = await lobby();
  await expect(
    caller().preparation.selectCharacter({ id, characterId: "friend-hero" }),
  ).rejects.toThrow("own characters");
  await expect(caller(third).preparation.get({ id })).rejects.toThrow(
    "another party",
  );
  await expect(
    caller(guest).preparation.setDungeon({ id, key: "dungeon1" }),
  ).rejects.toThrow("host");
  await ready(id);
  await expect(start(id, guest)).rejects.toThrow("host");
  const attempts = await Promise.allSettled([start(id), start(id)]);
  const starts = attempts.flatMap((attempt) =>
    attempt.status === "fulfilled" ? [attempt.value] : [],
  );
  expect(starts).toHaveLength(1);
  const run = await caller(guest).dungeon.getRun({ id: starts[0]!.dungeonId });
  expect(run.playerTeam.map((hero) => hero.id)).toEqual([
    "audit-hero",
    "friend-hero",
  ]);
  expect(run.shared!.participants.every((player) => !player.ready)).toBe(true);
  await expect(
    caller().preparation.selectCharacter({ id, characterId: "host-spare" }),
  ).rejects.toThrow("fixed");
  await expect(caller().dungeon.removeDungeon({ id: run.id })).rejects.toThrow(
    "preserve",
  );
  await expect(
    caller(third).dungeon.getDungeon({ id: run.id }),
  ).rejects.toThrow("another party");
  await expect(
    caller(third).dungeon.getDungeonBattles({ id: run.id }),
  ).rejects.toThrow("another party");
});

test("readiness resets for selection, dungeon, run-specific disconnect, and lease expiry", async () => {
  const id = await lobby();
  await ready(id);
  await caller().preparation.selectCharacter({ id, characterId: "host-spare" });
  expect(
    (await caller().preparation.get({ id })).participants.map(
      (player) => player.ready,
    ),
  ).toEqual([false, true]);
  await readyOne(id);
  await caller().preparation.setDungeon({ id, key: "dungeon1" });
  expect(
    (await caller().preparation.get({ id })).participants.map(
      (player) => player.ready,
    ),
  ).toEqual([false, false]);
  await ready(id);
  await setPreparationConnected(id, guest, `${id}:guest`, false, data.db);
  await expect(start(id)).rejects.toThrow("connected and freshly ready");
  await setPreparationConnected(id, guest, "replacement", true, data.db);
  await readyOne(id, guest);
  await setPreparationConnected(id, guest, `${id}:guest`, false, data.db);
  expect((await caller().preparation.get({ id })).canStart).toBe(true);
  await data.db
    .update(TB_preparationConnection)
    .set({ expiresAt: new Date(0) })
    .where(eq(TB_preparationConnection.connectionId, "replacement"));
  expect((await caller().preparation.get({ id })).canStart).toBe(false);
  await reconcilePreparationPresence(
    id,
    [
      { userId: host, connectionId: `${id}:host` },
      { userId: guest, connectionId: "replacement" },
    ],
    data.db,
  );
  expect((await caller().preparation.get({ id })).participants[1]!.ready).toBe(
    false,
  );
});

test("persistent build edits invalidate every waiting use of a character while active snapshots stay frozen", async () => {
  const active = await lobby();
  const waiting = await lobby();
  const another = await lobby();
  await ready(active);
  await ready(waiting);
  await ready(another);
  const run = await start(active);
  const frozen = await new SyncFactory(data.db).get(run.battleId);
  await data.db
    .insert(TB_spellStats)
    .values({ id: "new-spell", userId: host, type: "single-heal" });
  await caller().character.equipSpell({
    characterId: "audit-hero",
    spellId: "new-spell",
  });
  for (const id of [waiting, another]) {
    const preparation = await caller().preparation.get({ id });
    expect(preparation.participants.map((player) => player.ready)).toEqual([
      false,
      true,
    ]);
    await expect(start(id)).rejects.toThrow("freshly ready");
  }
  const after = await new SyncFactory(data.db).get(run.battleId);
  expect(after.characters[0]!.spells.map((spell) => spell.config.id)).toEqual(
    frozen.characters[0]!.spells.map((spell) => spell.config.id),
  );
  await readyOne(waiting);
  const second = await start(waiting);
  expect(second.dungeonId).not.toBe(run.dungeonId);
  const secondBuild = await new SyncFactory(data.db).get(second.battleId);
  expect(
    secondBuild.characters[0]!.spells.some(
      (spell) => spell.config.id === "new-spell",
    ),
  ).toBe(true);
  expect(
    (await caller().dungeon.getRun({ id: run.dungeonId })).activeBattleId,
  ).toBe(run.battleId);
});

test("equipment, passive transfers, removals and spent stat points require renewed consent in affected preparations", async () => {
  const first = await lobby();
  const spare = await lobby();
  await caller().preparation.selectCharacter({
    id: spare,
    characterId: "host-spare",
  });
  await data.db
    .insert(TB_equipmentStats)
    .values({ id: "new-equipment", userId: host, type: "iron-sword" });
  await data.db
    .insert(TB_passivSkillStats)
    .values({ id: "new-passive", userId: host, type: "armor-up" });
  const changedHost = async (id: string) => {
    const participants = (await caller().preparation.get({ id })).participants;
    expect(participants.map((player) => player.ready)).toEqual([false, true]);
  };
  for (const mutate of [
    () =>
      caller().character.equipEquipment({
        characterId: "audit-hero",
        equipmentId: "new-equipment",
      }),
    () => caller().character.unequipEquipment({ equipmentId: "new-equipment" }),
    () =>
      caller().character.applyStatIncrease({
        characterId: "audit-hero",
        stats: ["intelligence"],
      }),
    () =>
      caller().character.equipPassiveSkill({
        characterId: "audit-hero",
        passiveSkillId: "new-passive",
      }),
  ]) {
    await ready(first);
    await ready(spare);
    await mutate();
    await changedHost(first);
    expect((await caller().preparation.get({ id: spare })).canStart).toBe(true);
  }
  await ready(first);
  await caller().character.equipPassiveSkill({
    characterId: "host-spare",
    passiveSkillId: "new-passive",
  });
  await changedHost(first);
  await changedHost(spare);
  await ready(spare);
  await caller().character.unequipPassiveSkill({
    passiveSkillId: "new-passive",
  });
  await changedHost(spare);
});

test("each later encounter requires host path choice and both owners' new readiness", async () => {
  const id = await lobby(true);
  await ready(id);
  const started = await start(id);
  await settle(started.dungeonId, started.battleId);
  const run = await caller().dungeon.getRun({ id: started.dungeonId });
  await ready(id);
  expect((await caller().preparation.get({ id })).canStart).toBe(false);
  const offer = run.route!.forks[0]!.offers[0]!;
  const choice = {
    id: run.id,
    wave: 1,
    offerId: offer.id,
    action: offer.encounter.actions[0]!,
  };
  await expect(caller(guest).dungeon.choosePath(choice)).rejects.toThrow(
    "host",
  );
  await caller().dungeon.choosePath(choice);
  expect(
    (await caller().preparation.get({ id })).participants.every(
      (player) => !player.ready,
    ),
  ).toBe(true);
  await expect(fight(run.id)).rejects.toThrow("freshly ready");
  await ready(id);
  await expect(fight(run.id, guest)).rejects.toThrow("host");
  const battleId = await fight(run.id);
  expect(battleId).not.toBe(started.battleId);
  expect((await caller().dungeon.getRun({ id: run.id })).battles).toHaveLength(
    2,
  );
});

for (const action of ["removeFriend", "block"] as const)
  test(`${action} separates waiting preparations but keeps active parties and results`, async () => {
    const active = await lobby();
    const waiting = await lobby();
    const another = await lobby();
    await ready(active);
    const started = await start(active);
    await caller().social[action]({ userId: guest });
    for (const id of [waiting, another]) {
      expect((await caller().preparation.get({ id })).guestUserId).toBeNull();
      await expect(caller(guest).preparation.get({ id })).rejects.toThrow(
        "another party",
      );
    }
    expect(
      (await caller(guest).dungeon.getRun({ id: started.dungeonId })).shared!
        .guestUserId,
    ).toBe(guest);
    await settle(started.dungeonId, started.battleId);
    expect(
      (await caller(guest).dungeon.getRun({ id: started.dungeonId })).loot,
    ).toHaveLength(1);
    await ready(active);
    expect((await caller().preparation.get({ id: active })).canStart).toBe(
      true,
    );
  });

test("abandonment retains earned unclaimed rewards, is terminal, and leaves simultaneous runs independent", async () => {
  const id = await lobby();
  const parallel = await lobby();
  await ready(id);
  await ready(parallel);
  const run = await start(id);
  const other = await start(parallel);
  const result = await settle(run.dungeonId, run.battleId);
  const before = await caller(guest).dungeon.getRun({ id: run.dungeonId });
  const abandoned = await caller(guest).dungeon.abandon({ id: run.dungeonId });
  expect(abandoned.abandonedAt).toBeInstanceOf(Date);
  expect(
    (await caller().dungeon.abandon({ id: run.dungeonId })).abandonedAt,
  ).toEqual(abandoned.abandonedAt);
  await dungeonManager.handleDungeonCleared(
    run.dungeonId,
    run.battleId,
    [],
    result.teamA,
    "TEAM_A",
    data.db,
  );
  expect(
    (await caller(guest).dungeon.getRun({ id: run.dungeonId })).loot,
  ).toEqual(before.loot);
  await caller(guest).claimLoot(before.loot[0]!.id);
  expect(
    (await caller(guest).dungeon.getRun({ id: run.dungeonId })).loot,
  ).toEqual([]);
  await expect(fight(run.dungeonId)).rejects.toThrow();
  await expect(readyOne(id)).rejects.toThrow("not waiting");
  expect(
    (await caller().dungeon.getRun({ id: other.dungeonId })).activeBattleId,
  ).toBe(other.battleId);
  expect(
    (await caller().dungeon.activeDungeons()).map((dungeon) => dungeon.id),
  ).not.toContain(run.dungeonId);
});

test("a saved completed battle settles once before abandonment, while later incomplete outcomes cannot reward", async () => {
  const id = await lobby();
  await ready(id);
  const started = await start(id);
  const result = await outcome(started.battleId);
  await abandonDungeon(started.dungeonId, guest, data.db, {
    allowActiveBattle: true,
  });
  await dungeonManager.handleDungeonCleared(
    started.dungeonId,
    started.battleId,
    [],
    result.teamA,
    "TEAM_A",
    data.db,
  );
  const earned = await caller(guest).dungeon.getRun({ id: started.dungeonId });
  expect(earned.round).toBe(1);
  expect(earned.loot).toHaveLength(1);
  const pending = await lobby();
  await ready(pending);
  const interrupted = await start(pending);
  await expect(
    abandonDungeon(interrupted.dungeonId, guest, data.db),
  ).rejects.toThrow("must stop");
  await abandonDungeon(interrupted.dungeonId, guest, data.db, {
    allowActiveBattle: true,
  });
  await dungeonManager.handleDungeonCleared(
    interrupted.dungeonId,
    interrupted.battleId,
    [],
    result.teamA,
    "TEAM_A",
    data.db,
  );
  expect(
    (await caller().dungeon.getRun({ id: interrupted.dungeonId })).loot,
  ).toHaveLength(0);
  const [attempt] = await data.db
    .select()
    .from(TB_dungeonBattle)
    .where(eq(TB_dungeonBattle.battleId, interrupted.battleId));
  expect(attempt!.completedAt).toBeNull();
  expect(attempt!.abandonedAt).toBeInstanceOf(Date);
});

test("play again after defeat keeps the pair and host with fresh consent and preserves earlier results", async () => {
  const id = await lobby();
  await ready(id);
  const started = await start(id);
  await dungeonManager.handleDungeonCleared(
    started.dungeonId,
    started.battleId,
    [],
    [
      { id: "audit-hero", health: 0, mana: 0, dead: true },
      { id: "friend-hero", health: 0, mana: 0, dead: true },
    ],
    "TEAM_B",
    data.db,
  );
  const next = await caller(guest).preparation.playAgain({
    dungeonId: started.dungeonId,
  });
  expect(
    await caller().preparation.playAgain({ dungeonId: started.dungeonId }),
  ).toEqual(next);
  const preparation = await caller().preparation.get(next);
  expect(preparation.hostUserId).toBe(host);
  expect(preparation.guestUserId).toBe(guest);
  expect(
    preparation.participants.map((player) => [
      player.characterId,
      player.ready,
      player.connected,
    ]),
  ).toEqual([
    [null, false, false],
    [null, false, false],
  ]);
  expect(
    (await caller(guest).dungeon.getRun({ id: started.dungeonId })).battles,
  ).toHaveLength(1);
  await caller().social.block({ userId: guest });
  await expect(
    caller().preparation.playAgain({ dungeonId: started.dungeonId }),
  ).rejects.toThrow("friendship");
});

test("a shared victory retains all personal rewards and prepares the same pair again with no new invitation", async () => {
  await data.db.insert(TB_spellStats).values([
    {
      id: "host-offensive",
      userId: host,
      type: "bladestorm-rhythm",
      equippedBy: "audit-hero",
    },
    {
      id: "guest-offensive",
      userId: guest,
      type: "bladestorm-rhythm",
      equippedBy: "friend-hero",
    },
  ]);
  const id = await lobby();
  await ready(id);
  const started = await start(id);
  let battleId = started.battleId;
  for (let wave = 0; wave < 5; wave++) {
    if (wave) {
      await ready(id);
      battleId = await fight(started.dungeonId);
    }
    await settle(started.dungeonId, battleId);
  }
  const finished = await caller(guest).dungeon.getRun({
    id: started.dungeonId,
  });
  expect(finished.cleared).toBe(true);
  expect(finished.shared!.canPlayAgain).toBe(true);
  expect(finished.loot).toHaveLength(5);
  const invitations = await caller(guest).social.getInvitations();
  const next = await caller().preparation.playAgain({
    dungeonId: started.dungeonId,
  });
  expect(
    (await caller(guest).preparation.get(next)).participants.map(
      (player) => player.characterId,
    ),
  ).toEqual([null, null]);
  expect(await caller(guest).social.getInvitations()).toEqual(invitations);
  expect(
    (await caller(guest).dungeon.getRun({ id: started.dungeonId })).loot,
  ).toEqual(finished.loot);
  expect((await caller().getBattle(battleId)).winner).toBe("TEAM_A");
});

test("delayed ready requests cannot consent to a changed character, dungeon, build, or explicit unready", async () => {
  const id = await lobby();
  await readyOne(id, guest);
  for (const change of [
    () => caller().preparation.setDungeon({ id, key: "dungeon1" }),
    () =>
      caller().preparation.selectCharacter({ id, characterId: "host-spare" }),
  ]) {
    const delayed = await readyInput(id);
    await change();
    await expect(caller().preparation.ready(delayed)).rejects.toThrow(
      "Preparation changed",
    );
    expect(
      (await caller().preparation.get({ id })).participants[0]!.ready,
    ).toBe(false);
    await readyOne(id);
  }
  await readyOne(id, guest);
  const beforeUnready = await readyInput(id);
  await caller().preparation.ready({ ...beforeUnready, ready: false });
  await expect(caller().preparation.ready(beforeUnready)).rejects.toThrow(
    "Preparation changed",
  );
  expect(
    (await caller().preparation.get({ id })).participants.map(
      (player) => player.ready,
    ),
  ).toEqual([false, true]);
  const beforeBuildEdit = await readyInput(id);
  await data.db
    .insert(TB_spellStats)
    .values({ id: "delayed-ready-spell", userId: host, type: "single-heal" });
  await caller().character.equipSpell({
    characterId: "host-spare",
    spellId: "delayed-ready-spell",
  });
  await expect(caller().preparation.ready(beforeBuildEdit)).rejects.toThrow(
    "build changed",
  );
  await readyOne(id);
  expect((await caller().preparation.get({ id })).canStart).toBe(true);
});

test("socket generations and expired leases reject delayed consent while routine heartbeat and teammate readiness preserve it", async () => {
  const id = await lobby();
  const hostReady = await readyInput(id);
  const guestReady = await readyInput(id, guest);
  await caller().preparation.ready(hostReady);
  await caller(guest).preparation.ready(guestReady);
  expect((await caller().preparation.get({ id })).revision).toBe(
    hostReady.expectedRevision,
  );
  const initial = [
    { userId: host, connectionId: `${id}:host` },
    { userId: guest, connectionId: `${id}:guest` },
  ];
  await reconcilePreparationPresence(id, initial, data.db);
  expect((await caller().preparation.get({ id })).revision).toBe(
    hostReady.expectedRevision,
  );
  const replacement = [
    { userId: host, connectionId: `${id}:replacement` },
    initial[1]!,
  ];
  await reconcilePreparationPresence(id, replacement, data.db);
  const reconnected = await caller().preparation.get({ id });
  expect(reconnected.revision).toBeGreaterThan(hostReady.expectedRevision);
  expect(reconnected.participants.map((player) => player.ready)).toEqual([
    false,
    true,
  ]);
  await expect(caller().preparation.ready(hostReady)).rejects.toThrow(
    "Preparation changed",
  );
  await readyOne(id);
  const fresh = await readyInput(id);
  await setPreparationConnected(id, host, `${id}:host`, false, data.db);
  expect((await caller().preparation.get({ id })).revision).toBe(
    fresh.expectedRevision,
  );
  await data.db
    .update(TB_preparationConnection)
    .set({ expiresAt: new Date(0) })
    .where(
      eq(TB_preparationConnection.connectionId, replacement[0]!.connectionId),
    );
  await reconcilePreparationPresence(id, replacement, data.db);
  await expect(caller().preparation.ready(fresh)).rejects.toThrow(
    "Preparation changed",
  );
  expect((await caller().preparation.get({ id })).participants[0]!.ready).toBe(
    false,
  );
  await readyOne(id);
  expect((await caller().preparation.get({ id })).canStart).toBe(true);
});

test("ready and start retries from a previous encounter or path cannot enter the following encounter", async () => {
  const id = await lobby(true);
  const hostReady = await readyInput(id);
  const guestReady = await readyInput(id, guest);
  await caller().preparation.ready(hostReady);
  await caller(guest).preparation.ready(guestReady);
  const oldStart = { id, expectedRevision: hostReady.expectedRevision };
  const entered = await caller().preparation.start(oldStart);
  await settle(entered.dungeonId, entered.battleId);
  await expect(caller().preparation.ready(hostReady)).rejects.toThrow(
    "Preparation changed",
  );
  await expect(caller(guest).preparation.ready(guestReady)).rejects.toThrow(
    "Preparation changed",
  );
  const beforePath = await readyInput(id);
  await ready(id);
  const run = await caller().dungeon.getRun({ id: entered.dungeonId });
  const offer = run.route!.forks[0]!.offers[0]!;
  await caller().dungeon.choosePath({
    id: run.id,
    wave: 1,
    offerId: offer.id,
    action: offer.encounter.actions[0]!,
  });
  await expect(caller().preparation.ready(beforePath)).rejects.toThrow(
    "Preparation changed",
  );
  await ready(id);
  await expect(caller().preparation.start(oldStart)).rejects.toThrow(
    "Preparation changed",
  );
  await expect(
    caller().dungeon.fightDungeon({
      id: run.id,
      expectedRevision: oldStart.expectedRevision,
    }),
  ).rejects.toThrow("Preparation changed");
  expect((await caller().dungeon.getRun({ id: run.id })).battles).toHaveLength(
    1,
  );
  await fight(run.id);
  expect((await caller().dungeon.getRun({ id: run.id })).battles).toHaveLength(
    2,
  );
});
