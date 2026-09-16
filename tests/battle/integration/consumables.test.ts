import { afterEach, beforeEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { getItemDefinition } from "../../../apps/game/src/items/catalog";
import { createEnemyFromType } from "../../../apps/game/src/enemies/enemy-factory";
import { EnemyTypeSchema } from "../../../apps/game/src/enemies/base/enemy-types";
import { appRouter } from "../../../apps/server/src/routers/index";
import type { Context } from "../../../apps/server/src/lib/context";
import {
  TB_battleStart,
  TB_consumableUse,
  TB_dungeonData,
  TB_dungeonEnemy,
  TB_dungeonParticipant,
  TB_preparation,
} from "../../../apps/server/src/db/schema";
import {
  grantItems,
  readInventory,
} from "../../../apps/server/src/game-usecases/inventory";
import { LootManager } from "../../../apps/server/src/game-usecases/loot-manager";
import { bmStorage } from "../../../apps/server/src/game-usecases/bm-storage";
import { abandonDungeon } from "../../../apps/server/src/game-usecases/dungeon-abandon";
import {
  deserializeStartingBuilds,
  deserializeStartingGrid,
} from "../../../apps/server/src/battle/starting-build-codec";
import { reconstructBattle } from "../../../apps/server/src/battle/reconstruct-battle";
import { applyGridCommand } from "../../../apps/server/src/battle/commands";
import { database, type TestDatabase } from "../support/database";
import seedrandom from "seedrandom";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});
const caller = (userId: string | null = "audit-owner") =>
  appRouter.createCaller({
    db: data.db,
    session: userId ? { id: userId } : null,
  } as unknown as Context);
const grant = (quantity = 3) =>
  data.db.transaction((tx) =>
    grantItems(
      "audit-owner",
      [
        { type: getItemDefinition("healing-potion").type, quantity },
        { type: getItemDefinition("mana-potion").type, quantity },
      ],
      tx,
    ),
  );
const count = async (type: string) =>
  (await readInventory("audit-owner", data.db)).find(
    (item) => item.type === type,
  )?.quantity ?? 0;
const input = (itemType = "healing-potion") => ({
  requestId: crypto.randomUUID(),
  dungeonId: "audit-dungeon",
  characterId: "audit-hero",
  itemType,
  expected: { round: 0, health: 37, mana: 9 },
});

test("outside use restores resources and spends once across retries; partial restoration is capped", async () => {
  await grant();
  const request = input();
  expect(await caller().useConsumable(request)).toEqual({ restored: 40 });
  expect(await caller().useConsumable(request)).toEqual({ restored: 40 });
  expect(await count("healing-potion")).toBe(2);
  expect(
    (await caller().dungeon.getRun({ id: request.dungeonId })).playerTeam[0]!
      .health,
  ).toBe(77);
  await expect(
    caller().useConsumable({ ...request, itemType: "mana-potion" }),
  ).rejects.toThrow("already used");
  expect(
    await caller().useConsumable({
      ...input(),
      expected: { round: 0, health: 77, mana: 9 },
    }),
  ).toEqual({ restored: 23 });
  await expect(
    caller().useConsumable({
      ...input(),
      expected: { round: 0, health: 100, mana: 9 },
    }),
  ).rejects.toThrow("full health");
  expect(await count("healing-potion")).toBe(1);
  expect(
    await caller().useConsumable({
      ...input("mana-potion"),
      expected: { round: 0, health: 100, mana: 9 },
    }),
  ).toEqual({ restored: 25 });
  expect(await count("mana-potion")).toBe(2);
});

test("rejected or failed outside use leaves stock and run resources intact", async () => {
  await grant();
  await expect(caller(null).useConsumable(input())).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(caller("outsider").useConsumable(input())).rejects.toMatchObject(
    { code: "FORBIDDEN" },
  );
  await expect(caller().useConsumable(input("bone-shard"))).rejects.toThrow(
    "cannot be used",
  );
  await expect(
    caller().useConsumable({
      ...input(),
      expected: { round: 0, health: 1, mana: 9 },
    }),
  ).rejects.toThrow("changed");
  for (const state of [
    { activeBattle: true },
    { cleared: true },
    { abandonedAt: new Date() },
    { characterData: [{ characterId: "audit-hero", health: 0, mana: 9 }] },
  ]) {
    await data.db
      .update(TB_dungeonData)
      .set(state)
      .where(eq(TB_dungeonData.id, "audit-dungeon"));
    expect(await caller().getConsumableTargets()).toEqual([]);
    await expect(caller().useConsumable(input())).rejects.toThrow(
      "living character between encounters",
    );
    await data.db
      .update(TB_dungeonData)
      .set({
        activeBattle: false,
        cleared: false,
        abandonedAt: null,
        characterData: [{ characterId: "audit-hero", health: 37, mana: 9 }],
      })
      .where(eq(TB_dungeonData.id, "audit-dungeon"));
  }
  await data.db.execute(
    sql`CREATE FUNCTION fail_consumable_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'receipt failed'; END; $$`,
  );
  await data.db.execute(
    sql`CREATE TRIGGER fail_receipt BEFORE INSERT ON consumable_use FOR EACH ROW EXECUTE FUNCTION fail_consumable_receipt()`,
  );
  await expect(caller().useConsumable(input())).rejects.toThrow();
  expect(await count("healing-potion")).toBe(3);
  expect((await caller().getConsumableTargets())[0]!.health).toBe(37);
  expect(await data.db.select().from(TB_consumableUse)).toEqual([]);
});

test("fractional restoration persists across retries and clears shared readiness", async () => {
  await grant(1);
  await data.db
    .update(TB_dungeonData)
    .set({
      characterData: [{ characterId: "audit-hero", health: 99.5, mana: 9 }],
    })
    .where(eq(TB_dungeonData.id, "audit-dungeon"));
  await data.db.insert(TB_preparation).values({
    id: "consumable-preparation",
    key: "dungeon1",
    hostUserId: "audit-owner",
    dungeonId: "audit-dungeon",
    revision: 4,
    hostReadyRevision: 4,
    guestReadyRevision: 4,
  });
  const request = { ...input(), expected: { round: 0, health: 99.5, mana: 9 } };
  expect(await caller().useConsumable(request)).toEqual({ restored: 0.5 });
  expect(await caller().useConsumable(request)).toEqual({ restored: 0.5 });
  expect(await count("healing-potion")).toBe(0);
  expect((await caller().getConsumableTargets())[0]!.health).toBe(100);
  const [preparation] = await data.db.select().from(TB_preparation);
  expect(preparation).toMatchObject({
    revision: 5,
    hostReadyRevision: null,
    guestReadyRevision: null,
  });
});

test("loadouts reject materials and other owners, reserve once, and prevent overspending across runs", async () => {
  await grant(1);
  await expect(
    caller().character.setConsumableLoadout({
      characterId: "audit-hero",
      loadout: ["bone-shard", null],
    }),
  ).rejects.toThrow("battle consumables");
  await expect(
    caller("outsider").character.setConsumableLoadout({
      characterId: "audit-hero",
      loadout: ["healing-potion", null],
    }),
  ).rejects.toThrow("own character");
  await caller().character.setConsumableLoadout({
    characterId: "audit-hero",
    loadout: ["healing-potion", "mana-potion"],
  });
  const battleId = await caller().dungeon.fightDungeon({ id: "audit-dungeon" });
  expect(await count("healing-potion")).toBe(0);
  expect(await count("mana-potion")).toBe(0);
  await expect(
    caller().dungeon.fightDungeon({ id: "audit-dungeon" }),
  ).rejects.toThrow();
  await data.db.insert(TB_dungeonData).values({
    id: "other-run",
    key: "dungeon1",
    createdBy: "audit-owner",
    characterData: [{ characterId: "audit-hero", health: 37, mana: 9 }],
  });
  await data.db
    .insert(TB_dungeonParticipant)
    .values({ dungeonId: "other-run", characterId: "audit-hero" });
  await data.db.insert(TB_dungeonEnemy).values({
    id: "other-goblin",
    dungeonId: "other-run",
    type: "goblin",
    inRound: 0,
  });
  await expect(
    caller().useConsumable({ ...input(), dungeonId: "other-run" }),
  ).rejects.toThrow("Insufficient stock");
  await expect(
    caller().dungeon.fightDungeon({ id: "other-run" }),
  ).rejects.toThrow("Not enough potions");
  const [snapshot] = await data.db
    .select()
    .from(TB_battleStart)
    .where(eq(TB_battleStart.battleId, battleId));
  expect(
    deserializeStartingBuilds(snapshot!.builds)[0]!.consumables,
  ).toHaveLength(2);
  await caller().character.setConsumableLoadout({
    characterId: "audit-hero",
    loadout: [null, null],
  });
  expect(
    deserializeStartingBuilds(snapshot!.builds)[0]!.consumables,
  ).toHaveLength(2);
});

test("abandonment returns only unused bottles, exactly once, after a committed use", async () => {
  await grant(1);
  await caller().character.setConsumableLoadout({
    characterId: "audit-hero",
    loadout: ["healing-potion", "mana-potion"],
  });
  const battleId = await caller().dungeon.fightDungeon({ id: "audit-dungeon" });
  const [snapshot] = await data.db
    .select()
    .from(TB_battleStart)
    .where(eq(TB_battleStart.battleId, battleId));
  const battle = reconstructBattle(
    battleId,
    deserializeStartingBuilds(snapshot!.builds),
    [],
    deserializeStartingGrid(snapshot!.builds),
  );
  const activation = battle.grid!.activation!;
  applyGridCommand(
    battle,
    {
      type: "useConsumable",
      data: {
        entityId: "audit-hero",
        activationId: activation.id,
        revision: battle.revision,
        requestId: "drink",
        slot: 0,
      },
    },
    "audit-owner",
  );
  const options = {
    allowActiveBattle: true,
    expectedBattleId: battleId,
    remainingSupplies: battle.entities,
  };
  await abandonDungeon("audit-dungeon", "audit-owner", data.db, options);
  await abandonDungeon("audit-dungeon", "audit-owner", data.db, options);
  expect(await count("healing-potion")).toBe(0);
  expect(await count("mana-potion")).toBe(1);
});

test("battle result persistence and unused supply returns roll back together and retry safely", async () => {
  await grant(1);
  await caller().character.setConsumableLoadout({
    characterId: "audit-hero",
    loadout: ["healing-potion", "mana-potion"],
  });
  const battleId = await caller().dungeon.fightDungeon({ id: "audit-dungeon" });
  const [snapshot] = await data.db
    .select()
    .from(TB_battleStart)
    .where(eq(TB_battleStart.battleId, battleId));
  const battle = reconstructBattle(
    battleId,
    deserializeStartingBuilds(snapshot!.builds),
    [],
    deserializeStartingGrid(snapshot!.builds),
  );
  battle.getTeam("TEAM_B").forEach((enemy) => {
    enemy.health = 0;
  });
  await data.failWrites("battle_result");
  await expect(bmStorage.save(battle, data.db)).rejects.toThrow();
  expect(await count("healing-potion")).toBe(0);
  await data.allowWrites("battle_result");
  await bmStorage.save(battle, data.db);
  await bmStorage.save(battle, data.db);
  expect(await count("healing-potion")).toBe(1);
  expect(await count("mana-potion")).toBe(1);
});

test("every production supply and material has a real enemy source through the normal drop path", async () => {
  const found = new Set<string>();
  const rng = Object.assign(() => 0, seedrandom("all-drops"));
  for (const { value } of EnemyTypeSchema.options) {
    for (const reward of await new LootManager("audit-owner", data.db).drop(
      rng,
      createEnemyFromType(value).loot,
    )) {
      if (
        reward.type === "ITEM" &&
        getItemDefinition(reward.data.itemType).kind !== "equipment"
      )
        found.add(reward.data.itemType);
    }
  }
  expect([...found].sort()).toEqual([
    "bone-shard",
    "healing-potion",
    "living-resin",
    "mana-potion",
    "storm-scale",
  ]);
});
