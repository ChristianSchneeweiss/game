import { afterEach, beforeEach, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { BM } from "../../../apps/game/src/bm";
import { equipmentBuildPreview } from "../../../apps/game/src/items/equipment/build-preview";
import { itemFactory } from "../../../apps/game/src/items/equipment/item-factory";
import {
  TB_character,
  TB_equipmentStats,
  TB_user,
} from "../../../apps/server/src/db/schema";
import {
  equipEquipment,
  unequipEquipment,
} from "../../../apps/server/src/game-usecases/character";
import { EntityFactory } from "../../../apps/server/src/game-usecases/entity-factory";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});
const owner = "audit-owner";

test("equipment comparisons use the same attributes as battle initialization and leave the roster unchanged", async () => {
  const hero = await EntityFactory.createCharacter("audit-hero", data.db);
  for (const weapon of ["iron-sword", "oakwarden-staff"] as const) {
    const items = {
      WEAPON: itemFactory(weapon, "test-weapon", hero),
      ARMOR: itemFactory("iron-cuirass", "test-armor", hero),
    };
    const preview = equipmentBuildPreview(hero, items);
    expect(hero.equipped).toEqual({});
    expect(hero.attributeModifiers).toEqual([]);
    const combatant = await EntityFactory.createCharacter(
      "audit-hero",
      data.db,
    );
    combatant.equipped = items;
    const bm = new BM([combatant], `equipment-${weapon}`);
    for (const attribute of [
      "strength",
      "intelligence",
      "armor",
      "manaRegen",
    ] as const)
      expect(preview.getAttribute(attribute)).toBe(
        bm.getEntityById(hero.id)!.getAttribute(attribute),
      );
    expect(preview.getAttribute("armor")).toBe(12);
    expect(
      preview.getAttribute(
        weapon === "iron-sword" ? "strength" : "intelligence",
      ),
    ).toBe(weapon === "iron-sword" ? 24 : 28);
  }
});

test("two simultaneous replacements leave exactly one item in a slot; ownership and assignment are enforced", async () => {
  await data.db.insert(TB_equipmentStats).values([
    { id: "sword", type: "iron-sword", userId: owner },
    { id: "staff", type: "oakwarden-staff", userId: owner },
  ]);
  await Promise.all([
    equipEquipment("audit-hero", "sword", owner, data.db),
    equipEquipment("audit-hero", "staff", owner, data.db),
  ]);
  const assigned = await data.db
    .select()
    .from(TB_equipmentStats)
    .where(eq(TB_equipmentStats.equippedBy, "audit-hero"));
  expect(assigned).toHaveLength(1);
  await equipEquipment("audit-hero", assigned[0]!.id, owner, data.db);
  await data.db.insert(TB_character).values({
    id: "second-hero",
    userId: owner,
    name: "Second hero",
    health: 100,
    mana: 50,
    intelligence: 10,
    vitality: 10,
    agility: 10,
    strength: 10,
  });
  await expect(
    equipEquipment("second-hero", assigned[0]!.id, owner, data.db),
  ).rejects.toThrow("Unequip");
  await data.db.insert(TB_user).values({ id: "stranger", username: "other" });
  await data.db
    .insert(TB_equipmentStats)
    .values({ id: "foreign-armor", type: "iron-cuirass", userId: "stranger" });
  await expect(
    equipEquipment("audit-hero", "foreign-armor", owner, data.db),
  ).rejects.toThrow("Not your equipment");
  await expect(
    equipEquipment("audit-hero", assigned[0]!.id, "stranger", data.db),
  ).rejects.toThrow("Not your character");
  await expect(
    unequipEquipment(assigned[0]!.id, "stranger", data.db),
  ).rejects.toThrow("Not your equipment");
});

test("saved battle builds keep their original weapon and armor after the player changes equipment", async () => {
  await data.db.insert(TB_equipmentStats).values([
    { id: "sword", type: "iron-sword", userId: owner },
    { id: "staff", type: "oakwarden-staff", userId: owner },
    { id: "plate", type: "iron-cuirass", userId: owner },
  ]);
  await equipEquipment("audit-hero", "sword", owner, data.db);
  await equipEquipment("audit-hero", "plate", owner, data.db);
  const original = await EntityFactory.createCharacter("audit-hero", data.db);
  const sync = new SyncFactory(data.db);
  await sync.add("frozen-gear", [original], []);
  await equipEquipment("audit-hero", "staff", owner, data.db);
  await unequipEquipment("plate", owner, data.db);
  const current = await EntityFactory.createCharacter("audit-hero", data.db);
  const restored = (await sync.get("frozen-gear")).characters[0]!;
  expect(current.equipped.WEAPON?.itemType).toBe("oakwarden-staff");
  expect(current.equipped.ARMOR).toBeUndefined();
  expect(restored.equipped.WEAPON?.itemType).toBe("iron-sword");
  expect(restored.equipped.ARMOR?.itemType).toBe("iron-cuirass");
  expect(equipmentBuildPreview(restored).getAttribute("strength")).toBe(24);
  expect(equipmentBuildPreview(current).getAttribute("intelligence")).toBe(28);
});
