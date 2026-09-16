import type { Character } from "@loot-game/game/base-entity";
import type { Entity } from "@loot-game/game/entity-types";
import { getItemDefinition } from "@loot-game/game/items/catalog";
import {
  ConsumableLoadoutSchema,
  type ConsumableLoadout,
} from "@loot-game/game/items/consumables";
import { TRPCError } from "@trpc/server";
import { eq, inArray, sql } from "drizzle-orm";
import { deserializeStartingBuilds } from "../battle/starting-build-codec";
import { TB_battleStart, TB_character, type Database } from "../db/schema";
import { lockCharacters } from "./character-locks";
import { grantItems, spendItems, type ItemAmount } from "./inventory";

export async function setConsumableLoadout(
  characterId: string,
  loadout: ConsumableLoadout,
  userId: string,
  db: Database,
) {
  const selected = ConsumableLoadoutSchema.parse(loadout);
  for (const type of selected) {
    if (!type) continue;
    const item = getItemDefinition(type);
    if (item.kind !== "consumable" || !item.useContexts.includes("battle"))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose battle consumables for these slots",
      });
  }
  await db.transaction(async (tx) => {
    const [hero] = await lockCharacters([characterId], tx);
    if (hero?.userId !== userId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Choose your own character",
      });
    await tx
      .update(TB_character)
      .set({
        consumableLoadout: selected,
        buildRevision: sql`${TB_character.buildRevision} + 1`,
      })
      .where(eq(TB_character.id, characterId));
  });
}

export async function readConsumableLoadout(
  characterId: string,
  userId: string,
  db: Database,
) {
  const [hero] = await db
    .select()
    .from(TB_character)
    .where(eq(TB_character.id, characterId));
  if (hero?.userId !== userId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Choose your own character",
    });
  return ConsumableLoadoutSchema.parse(hero.consumableLoadout);
}

/** Called under the run and character locks; stock and the starting snapshot commit together. */
export async function reserveBattleSupplies(
  characters: Character[],
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
) {
  const rows = await tx
    .select()
    .from(TB_character)
    .where(
      inArray(
        TB_character.id,
        characters.map((hero) => hero.id),
      ),
    );
  const costs = new Map<string, ItemAmount[]>();
  for (const hero of characters) {
    hero.consumables = [];
    // Fallen party members do not bring supplies into an encounter.
    if (hero.health <= 0) continue;
    const loadout = ConsumableLoadoutSchema.parse(
      rows.find((row) => row.id === hero.id)!.consumableLoadout,
    );
    loadout.forEach((type, slot) => {
      if (!type) return;
      const item = getItemDefinition(type);
      if (item.kind !== "consumable" || !item.useContexts.includes("battle"))
        throw new Error("Invalid battle consumable loadout");
      hero.consumables.push({
        version: 1,
        slot: slot as 0 | 1,
        type: item.type,
        name: item.name,
        restoration: item.restoration,
        quantity: 1,
      });
      const ownerCosts = costs.get(hero.userId) ?? [];
      ownerCosts.push({ type: item.type, quantity: 1 });
      costs.set(hero.userId, ownerCosts);
    });
  }
  for (const owner of [...costs.keys()].sort()) {
    try {
      await spendItems(owner, costs.get(owner)!, tx);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Insufficient stock:")
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Not enough potions for the equipped slots. Change your consumable loadout or collect more.",
        });
      throw error;
    }
  }
}

/** Completion and abandonment share one locked return receipt. Replays never touch inventory. */
export async function returnBattleSupplies(
  battleId: string,
  entities: readonly Pick<Entity, "id" | "consumables">[],
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
) {
  const [snapshot] = await tx
    .select()
    .from(TB_battleStart)
    .where(eq(TB_battleStart.battleId, battleId))
    .for("update");
  if (!snapshot || snapshot.suppliesReturnedAt) return;
  const refunds = new Map<string, ItemAmount[]>();
  for (const build of deserializeStartingBuilds(snapshot.builds)) {
    if (!build.character || !build.consumables.length) continue;
    const remaining = entities.find(
      (entity) => entity.id === build.id,
    )?.consumables;
    if (!remaining) throw new Error("Missing remaining battle supplies");
    for (const frozen of build.consumables) {
      const item = remaining.find((item) => item.slot === frozen.slot);
      if (
        !item ||
        item.type !== frozen.type ||
        ![0, 1].includes(item.quantity) ||
        item.quantity > frozen.quantity
      )
        throw new Error("Invalid remaining battle supplies");
      if (!item.quantity) continue;
      const ownerRefunds = refunds.get(build.character.userId) ?? [];
      ownerRefunds.push({
        type: getItemDefinition(frozen.type).type,
        quantity: item.quantity,
      });
      refunds.set(build.character.userId, ownerRefunds);
    }
  }
  for (const owner of [...refunds.keys()].sort())
    await grantItems(owner, refunds.get(owner)!, tx);
  await tx
    .update(TB_battleStart)
    .set({ suppliesReturnedAt: new Date() })
    .where(eq(TB_battleStart.battleId, battleId));
}
