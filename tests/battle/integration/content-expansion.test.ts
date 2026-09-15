import { expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { BM } from "../../../apps/game/src/bm";
import { EnemyTypeSchema } from "../../../apps/game/src/enemies/base/enemy-types";
import { createEnemyFromType } from "../../../apps/game/src/enemies/enemy-factory";
import {
  TB_equipmentStats,
  TB_loot,
  TB_passivSkillStats,
} from "../../../apps/server/src/db/schema";
import {
  equipEquipment,
  equipPassiveSkill,
  unequipEquipment,
  unequipPassiveSkill,
} from "../../../apps/server/src/game-usecases/character";
import { EntityFactory } from "../../../apps/server/src/game-usecases/entity-factory";
import { LootManager } from "../../../apps/server/src/game-usecases/loot-manager";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { database } from "../support/database";
import { newItems, newPassives } from "../support/content-expansion";
import { combatState } from "../support/invariants";

test("new dungeon rewards can be collected, equipped, and rebuilt from a frozen battle after unequipping", async () => {
  const data = await database();
  try {
    const wanted = new Set<string>([...newItems, ...newPassives]);
    const rewards = EnemyTypeSchema.options.flatMap(({ value }) =>
      createEnemyFromType(value).loot.items.filter((drop) =>
        drop.type === "ITEM"
          ? wanted.has(drop.data.itemType)
          : drop.type === "PASSIVE" && wanted.has(drop.data.passiveType),
      ),
    );
    expect(rewards).toHaveLength(wanted.size);
    await data.db.insert(TB_loot).values({
      id: "content-loot",
      battleId: "content-victory",
      userId: "audit-owner",
      gold: 0,
      items: rewards,
    });
    const loot = new LootManager("audit-owner", data.db);
    await loot.claim("content-loot");
    expect(await loot.getLoot()).toEqual([]);
    const equipment = await data.db.select().from(TB_equipmentStats);
    const passives = await data.db.select().from(TB_passivSkillStats);
    expect(equipment.map((item) => item.type).sort()).toEqual(
      [...newItems].sort(),
    );
    expect(passives.map((passive) => passive.type).sort()).toEqual(
      [...newPassives].sort(),
    );
    for (const item of equipment)
      await equipEquipment("audit-hero", item.id, "audit-owner", data.db);
    for (const passive of passives)
      await equipPassiveSkill("audit-hero", passive.id, "audit-owner", data.db);
    const original = await EntityFactory.createCharacter("audit-hero", data.db);
    expect(original.passiveSkills).toHaveLength(newPassives.length);
    const sync = new SyncFactory(data.db);
    await sync.add("content-frozen", [original], []);
    for (const item of equipment)
      await unequipEquipment(item.id, "audit-owner", data.db);
    for (const passive of passives)
      await unequipPassiveSkill(passive.id, "audit-owner", data.db);
    const current = await EntityFactory.createCharacter("audit-hero", data.db);
    expect(current.equipped).toEqual({});
    expect(current.passiveSkills).toEqual([]);
    const restored = (await sync.get("content-frozen")).characters[0]!;
    expect(
      Object.values(restored.equipped).map((item) => item.itemType),
    ).toEqual(Object.values(original.equipped).map((item) => item.itemType));
    expect(restored.passiveSkills).toHaveLength(newPassives.length);
    expect(combatState(new BM([restored], "content-frozen"))).toEqual(
      combatState(new BM([original], "content-frozen")),
    );
    // Reclaiming the same reward cannot duplicate its inventory rows.
    await expect(loot.claim("content-loot")).rejects.toThrow("Loot not found");
    expect(
      await data.db
        .select()
        .from(TB_equipmentStats)
        .where(eq(TB_equipmentStats.userId, "audit-owner")),
    ).toHaveLength(newItems.length);
  } finally {
    await data.close();
  }
});
