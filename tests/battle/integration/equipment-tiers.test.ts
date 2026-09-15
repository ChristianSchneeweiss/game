import { expect, test } from "bun:test";
import { EnemyTypeSchema } from "../../../apps/game/src/enemies/base/enemy-types";
import { createEnemyFromType } from "../../../apps/game/src/enemies/enemy-factory";
import {
  TIERED_EQUIPMENT,
  tieredEquipmentTypes,
} from "../../../apps/game/src/items/equipment/tiered-equipment";
import { EQUIPMENT_SLOTS } from "../../../apps/game/src/items/equipment/equipment-slots";
import { TB_equipmentStats, TB_loot } from "../../../apps/server/src/db/schema";
import {
  equipEquipment,
  unequipEquipment,
} from "../../../apps/server/src/game-usecases/character";
import { EntityFactory } from "../../../apps/server/src/game-usecases/entity-factory";
import { LootManager } from "../../../apps/server/src/game-usecases/loot-manager";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { database } from "../support/database";

test("all new rewards can be claimed; nine slots persist and frozen builds survive replacement and removal", async () => {
  const data = await database();
  try {
    const wanted = new Set<string>(tieredEquipmentTypes);
    const rewards = EnemyTypeSchema.options.flatMap(({ value }) =>
      createEnemyFromType(value).loot.items.filter(
        (drop) => drop.type === "ITEM" && wanted.has(drop.data.itemType),
      ),
    );
    expect(rewards).toHaveLength(49);
    await data.db
      .insert(TB_loot)
      .values({
        id: "tiered-loot",
        battleId: "tiered-victory",
        userId: "audit-owner",
        gold: 0,
        items: rewards,
      });
    await new LootManager("audit-owner", data.db).claim("tiered-loot");
    const equipment = await data.db.select().from(TB_equipmentStats);
    expect(equipment).toHaveLength(49);
    const selected = tieredEquipmentTypes.filter(
      (type) => TIERED_EQUIPMENT[type].tier === "S",
    );
    for (const type of selected)
      await equipEquipment(
        "audit-hero",
        equipment.find((item) => item.type === type)!.id,
        "audit-owner",
        data.db,
      );
    const original = await EntityFactory.createCharacter("audit-hero", data.db);
    expect(Object.keys(original.equipped)).toHaveLength(9);
    const sync = new SyncFactory(data.db);
    await sync.add("tiered-frozen", [original], []);
    const replacement = equipment.find((item) => item.type === "copper-band")!;
    await equipEquipment("audit-hero", replacement.id, "audit-owner", data.db);
    const updated = await EntityFactory.createCharacter("audit-hero", data.db);
    expect(updated.equipped.RING?.itemType).toBe("copper-band");
    for (const slot of EQUIPMENT_SLOTS.filter((slot) => slot !== "RING"))
      expect(updated.equipped[slot]?.id).toBe(original.equipped[slot]?.id);
    for (const item of Object.values(updated.equipped))
      await unequipEquipment(item.id, "audit-owner", data.db);
    expect(
      (await EntityFactory.createCharacter("audit-hero", data.db)).equipped,
    ).toEqual({});
    const restored = (await sync.get("tiered-frozen")).characters[0]!;
    for (const slot of EQUIPMENT_SLOTS) {
      expect(restored.equipped[slot]?.itemType).toBe(
        original.equipped[slot]?.itemType,
      );
      expect(restored.equipped[slot]?.modifiers).toEqual(
        original.equipped[slot]?.modifiers,
      );
    }
  } finally {
    await data.close();
  }
});
