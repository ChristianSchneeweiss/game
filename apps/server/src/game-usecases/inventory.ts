import {
  getItemDefinition,
  type ItemDefinition,
  type ItemType,
} from "@loot-game/game/items/catalog";
import { equipmentFactory } from "@loot-game/game/items/equipment/equipment-factory";
import { ItemQuantitySchema } from "@loot-game/game/items/quantity";
import { and, eq, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import {
  TB_character,
  TB_equipmentStats,
  TB_itemStack,
  TB_user,
  type Database,
} from "../db/schema";

type Transaction = PgTransaction<any, any, any>;
export type ItemAmount = { type: ItemType; quantity: number };
export type InventoryEntry =
  | {
      kind: "equipment";
      id: string;
      type: Extract<ItemDefinition, { kind: "equipment" }>["type"];
      quantity: 1;
      equippedBy: string | null;
      equippedCharacterName: string | null;
      item: Extract<ItemDefinition, { kind: "equipment" }>;
    }
  | {
      kind: "consumable" | "material";
      id: string;
      type: Exclude<ItemDefinition, { kind: "equipment" }>["type"];
      quantity: number;
      item: Exclude<ItemDefinition, { kind: "equipment" }>;
    };

function batch(items: readonly ItemAmount[], stackableOnly = false) {
  const combined = new Map<
    ItemType,
    { item: ItemDefinition; quantity: number }
  >();
  for (const { type, quantity } of items) {
    const item = getItemDefinition(type);
    if (stackableOnly && item.kind === "equipment")
      throw new Error("Equipment cannot be spent as a stack");
    ItemQuantitySchema.parse(quantity);
    const total = (combined.get(type)?.quantity ?? 0) + quantity;
    combined.set(type, { item, quantity: ItemQuantitySchema.parse(total) });
  }
  return [...combined.values()].sort((a, b) =>
    a.item.type.localeCompare(b.item.type),
  );
}

export async function lockInventory(userId: string, tx: Transaction) {
  // Lock the existing owner even for a first grant, when no stack row exists.
  // NO KEY UPDATE allows foreign-key checks; all inventory mutations take this
  // one lock before touching stock. It lasts only for the gameplay transaction.
  const [owner] = await tx
    .select({ id: TB_user.id })
    .from(TB_user)
    .where(eq(TB_user.id, userId))
    .for("no key update");
  if (!owner) throw new Error("Inventory owner not found");
}

async function stock(userId: string, tx: Transaction) {
  const rows = await tx
    .select()
    .from(TB_itemStack)
    .where(eq(TB_itemStack.userId, userId));
  return new Map(rows.map((row) => [row.type, row.quantity]));
}

/** Trusted gameplay operation. Supply the enclosing transaction and propagate
 * every failure so that both inventory and its reward/command roll back. */
export async function grantItems(
  userId: string,
  items: readonly ItemAmount[],
  tx: Transaction,
) {
  const grants = batch(items);
  if (!grants.length) return;
  await lockInventory(userId, tx);
  const existing = await stock(userId, tx);
  for (const { item, quantity } of grants) {
    if (item.kind !== "equipment")
      ItemQuantitySchema.parse((existing.get(item.type) ?? 0) + quantity);
  }
  for (const { item, quantity } of grants) {
    if (item.kind === "equipment") {
      // Bound statement size without imposing a gameplay capacity limit.
      for (let remaining = quantity; remaining > 0; remaining -= 1000) {
        await tx.insert(TB_equipmentStats).values(
          Array.from({ length: Math.min(remaining, 1000) }, () => ({
            userId,
            type: item.type,
          })),
        );
      }
    } else {
      await tx
        .insert(TB_itemStack)
        .values({ userId, type: item.type, quantity })
        .onConflictDoUpdate({
          target: [TB_itemStack.userId, TB_itemStack.type],
          set: { quantity: sql`${TB_itemStack.quantity} + ${quantity}` },
        });
    }
  }
}

/** Costs are checked as one batch under the
 * same inventory lock as grants, so insufficient stock changes nothing. */
export async function spendItems(
  userId: string,
  items: readonly ItemAmount[],
  tx: Transaction,
) {
  const costs = batch(items, true);
  if (!costs.length) return;
  await lockInventory(userId, tx);
  const existing = await stock(userId, tx);
  for (const { item, quantity } of costs) {
    if (item.kind === "equipment" || (existing.get(item.type) ?? 0) < quantity)
      throw new Error(`Insufficient stock: ${item.type}`);
  }
  for (const { item, quantity } of costs) {
    if (item.kind === "equipment")
      throw new Error("Equipment cannot be spent as a stack");
    const where = and(
      eq(TB_itemStack.userId, userId),
      eq(TB_itemStack.type, item.type),
    );
    const remaining = existing.get(item.type)! - quantity;
    if (remaining === 0) await tx.delete(TB_itemStack).where(where);
    else
      await tx.update(TB_itemStack).set({ quantity: remaining }).where(where);
  }
}

export async function readInventory(
  userId: string,
  db: Database,
): Promise<InventoryEntry[]> {
  const [equipment, stacks] = await Promise.all([
    db
      .select({
        equipment: TB_equipmentStats,
        equippedCharacterName: TB_character.name,
      })
      .from(TB_equipmentStats)
      .leftJoin(TB_character, eq(TB_character.id, TB_equipmentStats.equippedBy))
      .where(eq(TB_equipmentStats.userId, userId)),
    db.select().from(TB_itemStack).where(eq(TB_itemStack.userId, userId)),
  ]);
  return [
    ...equipment.map(
      ({ equipment: row, equippedCharacterName }): InventoryEntry => {
        const item = getItemDefinition(row.type);
        if (item.kind !== "equipment")
          throw new Error(`Invalid equipment: ${row.type}`);
        return {
          kind: item.kind,
          id: row.id,
          type: item.type,
          quantity: 1,
          equippedBy: row.equippedBy,
          equippedCharacterName,
          item,
        };
      },
    ),
    ...stacks.map((row): InventoryEntry => {
      const item = getItemDefinition(row.type);
      if (item.kind === "equipment")
        throw new Error(`Invalid stack: ${row.type}`);
      return {
        kind: item.kind,
        id: `stack:${row.type}`,
        type: item.type,
        quantity: ItemQuantitySchema.parse(row.quantity),
        item,
      };
    }),
  ];
}

/** Narrow compatibility projection used by character gear preparation. */
export async function readEquipment(userId: string, db: Database) {
  const rows = await db
    .select()
    .from(TB_equipmentStats)
    .where(eq(TB_equipmentStats.userId, userId));
  return rows.map((row) => ({
    ...row,
    item: equipmentFactory(row.type, row.id, {
      id: row.equippedBy ?? "inventory",
    }),
  }));
}
