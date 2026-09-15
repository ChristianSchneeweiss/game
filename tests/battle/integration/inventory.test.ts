import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import seedrandom from "seedrandom";
import type { LootEntity } from "../../../apps/game/src/types";
import { MAX_ITEM_QUANTITY } from "../../../apps/game/src/items/quantity";
import {
  TB_equipmentStats,
  TB_itemStack,
  TB_loot,
  TB_user,
} from "../../../apps/server/src/db/schema";
import {
  grantItems,
  spendItems,
} from "../../../apps/server/src/game-usecases/inventory";
import { equipEquipment } from "../../../apps/server/src/game-usecases/character";
import { LootManager } from "../../../apps/server/src/game-usecases/loot-manager";
import type { Context } from "../../../apps/server/src/lib/context";
import { appRouter } from "../../../apps/server/src/routers/index";
import { database, type TestDatabase } from "../support/database";
import {
  installItemFixtures,
  itemFixtureEnemy,
} from "../support/item-fixtures";
import { createEnemyFromType } from "../../../apps/game/src/enemies/enemy-factory";
import { EnemyTypeSchema } from "../../../apps/game/src/enemies/base/enemy-types";

const fixtures = installItemFixtures();
const material = fixtures.material.type;
const supply = fixtures.consumable.type;
let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});
afterAll(fixtures.restore);
const caller = (owner: string | null = "audit-owner") =>
  appRouter.createCaller({
    session: owner ? { id: owner } : null,
    db: data.db,
    cfEnv: {},
  } as unknown as Context);
const grant = (items: Parameters<typeof grantItems>[1]) =>
  data.db.transaction((tx) => grantItems("audit-owner", items, tx));
const spend = (items: Parameters<typeof spendItems>[1]) =>
  data.db.transaction((tx) => spendItems("audit-owner", items, tx));
const reward = async (id: string, items: LootEntity[]) =>
  data.db
    .insert(TB_loot)
    .values({ id, battleId: id, userId: "audit-owner", gold: 0, items });

test("enemy rolls, persisted rewards, authenticated claims and inventory reads preserve all kinds and quantities", async () => {
  const enemy = itemFixtureEnemy([
    { type: "ITEM", dropRate: 1, data: { itemType: material, quantity: 4 } },
    { type: "ITEM", dropRate: 1, data: { itemType: material, quantity: 2 } },
    { type: "ITEM", dropRate: 1, data: { itemType: supply, quantity: 3 } },
    {
      type: "ITEM",
      dropRate: 1,
      data: { itemType: "iron-sword", quantity: 3 },
    },
    {
      type: "ITEM",
      dropRate: 0,
      data: { itemType: "iron-cuirass", quantity: 7 },
    },
  ]);
  const drops = await new LootManager("audit-owner", data.db).drop(
    seedrandom("items"),
    enemy.loot,
  );
  expect(drops).toHaveLength(4);
  await reward("mixed", drops);
  expect((await caller().getMyLoot())[0]!.items).toEqual(drops);
  await caller().claimLoot("mixed");
  const inventory = await caller().getMyInventory();
  expect(inventory.filter((item) => item.kind === "equipment")).toHaveLength(3);
  expect(new Set(inventory.map((item) => item.id)).size).toBe(5);
  expect(inventory.find((item) => item.type === material)).toMatchObject({
    quantity: 6,
    item: fixtures.material,
  });
  expect(inventory.find((item) => item.type === supply)).toMatchObject({
    quantity: 3,
    item: fixtures.consumable,
  });
  const sword = inventory.find((item) => item.kind === "equipment")!;
  await equipEquipment("audit-hero", sword.id, "audit-owner", data.db);
  expect(
    (await caller().getMyInventory()).find((item) => item.id === sword.id),
  ).toMatchObject({
    equippedBy: "audit-hero",
    equippedCharacterName: "Test hero",
  });
  expect(await caller().getMyEquipment()).toHaveLength(3);
  await reward("again", drops);
  await caller().claimLoot("again");
  expect(
    (await caller().getMyInventory()).find((item) => item.type === material)
      ?.quantity,
  ).toBe(12);
  expect(
    (await caller().getMyInventory()).find((item) => item.type === supply)
      ?.quantity,
  ).toBe(6);
  expect(await data.db.select().from(TB_itemStack)).toHaveLength(2);
  expect(await caller().getMyLoot()).toEqual([]);
  await expect(caller().claimLoot("mixed")).rejects.toThrow("Loot not found");
});

test("reads and claims are account scoped and work without a character", async () => {
  await data.db
    .insert(TB_user)
    .values({ id: "other-owner", username: "other" });
  await reward("private", [
    { type: "ITEM", dropRate: 1, data: { itemType: supply } },
  ]);
  await expect(caller("other-owner").claimLoot("private")).rejects.toThrow(
    "Loot not found",
  );
  expect(await caller("other-owner").getMyInventory()).toEqual([]);
  expect(await caller("other-owner").getMyEquipment()).toEqual([]);
  await data.db.transaction((tx) =>
    grantItems(
      "other-owner",
      [
        { type: supply, quantity: 2 },
        { type: "iron-sword", quantity: 1 },
      ],
      tx,
    ),
  );
  expect(await caller("other-owner").getMyInventory()).toHaveLength(2);
  expect(await caller("other-owner").getMyEquipment()).toHaveLength(1);
  expect(await caller().getMyInventory()).toEqual([]);
  await expect(caller(null).getMyInventory()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(caller(null).claimLoot("private")).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
});

test("a failed mixed claim retains the reward and rolls back all copies and stacks; retry grants once", async () => {
  await grant([{ type: material, quantity: 2 }]);
  await reward("retry", [
    {
      type: "ITEM",
      dropRate: 1,
      data: { itemType: "iron-sword", quantity: 2 },
    },
    { type: "ITEM", dropRate: 1, data: { itemType: material, quantity: 3 } },
  ]);
  const before = await caller().getMyInventory();
  await data.db.execute(
    sql`CREATE FUNCTION test_fail_stack_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected stack write failure'; END; $$`,
  );
  await data.db.execute(
    sql`CREATE TRIGGER test_stack_write_failure BEFORE INSERT OR UPDATE ON item_stack FOR EACH ROW EXECUTE FUNCTION test_fail_stack_write()`,
  );
  await expect(caller().claimLoot("retry")).rejects.toThrow();
  expect(await caller().getMyInventory()).toEqual(before);
  expect(await caller().getMyLoot()).toHaveLength(1);
  await data.db.execute(
    sql`DROP TRIGGER test_stack_write_failure ON item_stack`,
  );
  await caller().claimLoot("retry");
  expect(await data.db.select().from(TB_equipmentStats)).toHaveLength(2);
  expect(
    (await caller().getMyInventory()).find((item) => item.type === material)
      ?.quantity,
  ).toBe(5);
  await expect(caller().claimLoot("retry")).rejects.toThrow("Loot not found");
});

test("legacy rewards without quantities grant one, while malformed rewards fail without consuming the claim", async () => {
  await reward("legacy", [
    { type: "ITEM", dropRate: 1, data: { itemType: "int-armor" } },
    { type: "ITEM", dropRate: 1, data: { itemType: material } },
  ]);
  await caller().claimLoot("legacy");
  expect(
    (await caller().getMyInventory()).map((entry) => entry.quantity),
  ).toEqual([1, 1]);
  const invalid = [0, -1, 1.5, null, "2", MAX_ITEM_QUANTITY + 1];
  for (const [index, quantity] of invalid.entries()) {
    const id = `invalid-${index}`;
    await reward(id, [
      { type: "ITEM", dropRate: 1, data: { itemType: material, quantity } },
    ] as LootEntity[]);
    await expect(caller().claimLoot(id)).rejects.toThrow();
    expect(
      await data.db.select().from(TB_loot).where(eq(TB_loot.id, id)),
    ).toHaveLength(1);
  }
  await reward("unknown", [
    { type: "ITEM", dropRate: 1, data: { itemType: "missing" } },
  ] as LootEntity[]);
  await expect(caller().claimLoot("unknown")).rejects.toThrow(
    "Unknown item type",
  );
  expect(
    (await caller().getMyInventory()).map((entry) => entry.quantity),
  ).toEqual([1, 1]);
});

test("complete grant batches reject overflow, unknown identities and invalid quantities", async () => {
  await grant([{ type: material, quantity: MAX_ITEM_QUANTITY }]);
  const before = await caller().getMyInventory();
  await expect(
    grant([
      { type: "iron-sword", quantity: 1 },
      { type: material, quantity: 1 },
    ]),
  ).rejects.toThrow();
  await expect(
    grant([
      { type: supply, quantity: MAX_ITEM_QUANTITY },
      { type: supply, quantity: 1 },
    ]),
  ).rejects.toThrow();
  for (const quantity of [0, -1, 1.1, NaN, Infinity])
    await expect(grant([{ type: supply, quantity }])).rejects.toThrow();
  await expect(
    grant([{ type: "bad-type" as typeof material, quantity: 1 }]),
  ).rejects.toThrow();
  expect(await caller().getMyInventory()).toEqual(before);
});

test("spending combines duplicate costs, rejects a deficient batch without changes and deletes depleted stacks", async () => {
  await grant([
    { type: material, quantity: 5 },
    { type: supply, quantity: 1 },
  ]);
  const before = await caller().getMyInventory();
  await expect(
    spend([
      { type: material, quantity: 3 },
      { type: material, quantity: 3 },
    ]),
  ).rejects.toThrow("Insufficient stock");
  await expect(
    spend([
      { type: material, quantity: 2 },
      { type: supply, quantity: 2 },
    ]),
  ).rejects.toThrow("Insufficient stock");
  await expect(spend([{ type: "iron-sword", quantity: 1 }])).rejects.toThrow(
    "Equipment cannot",
  );
  expect(await caller().getMyInventory()).toEqual(before);
  await spend([
    { type: material, quantity: 2 },
    { type: material, quantity: 3 },
  ]);
  expect((await caller().getMyInventory()).map((item) => item.type)).toEqual([
    supply,
  ]);
  await spend([{ type: supply, quantity: 1 }]);
  await expect(spend([{ type: supply, quantity: 1 }])).rejects.toThrow(
    "Insufficient stock",
  );
  expect(await caller().getMyInventory()).toEqual([]);
});

test("existing loot retains per-entry rolls, ordering and RNG consumption; enemy-specific rates stay independent", async () => {
  const manager = new LootManager("audit-owner", data.db);
  for (const { value } of EnemyTypeSchema.options) {
    const enemy = createEnemyFromType(value);
    const expectedRng = seedrandom(`existing:${value}`);
    const rng = seedrandom(`existing:${value}`);
    const expected = enemy.loot.items.filter(
      (entry) => expectedRng() < entry.dropRate,
    );
    expect(await manager.drop(rng, enemy.loot)).toEqual(expected);
    expect(rng()).toBe(expectedRng());
  }
  const rates = [0.2, 0.8].map((dropRate) =>
    itemFixtureEnemy([
      { type: "ITEM", dropRate, data: { itemType: material, quantity: 2 } },
    ]),
  );
  const rng = Object.assign(() => 0.5, seedrandom("unused")) as seedrandom.PRNG;
  expect(await manager.drop(rng, rates[0]!.loot)).toEqual([]);
  expect(await manager.drop(rng, rates[1]!.loot)).toEqual(rates[1]!.loot.items);
  for (const dropRate of [-1, 1.01, Infinity, NaN]) {
    const enemy = itemFixtureEnemy([
      { type: "ITEM", dropRate, data: { itemType: material } },
    ]);
    await expect(manager.drop(rng, enemy.loot)).rejects.toThrow();
  }
  for (const quantity of [undefined, null, 0, 1.5, Infinity, NaN]) {
    const enemy = itemFixtureEnemy([
      { type: "ITEM", dropRate: 1, data: { itemType: material, quantity } },
    ] as LootEntity[]);
    await expect(manager.drop(rng, enemy.loot)).rejects.toThrow();
  }
});
