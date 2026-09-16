import { z } from "zod";
import { RestorationSchema } from "./stackable-catalog";

export const ConsumableSlotSchema = z.union([z.literal(0), z.literal(1)]);
export const ConsumableLoadoutSchema = z.tuple([
  z.string().nullable(),
  z.string().nullable(),
]);
export type ConsumableLoadout = z.infer<typeof ConsumableLoadoutSchema>;

// Freeze effect values with the encounter so later catalog edits cannot change a replay.
export const BattleConsumableSchema = z
  .object({
    version: z.literal(1),
    slot: ConsumableSlotSchema,
    type: z.string().min(1),
    name: z.string().min(1),
    restoration: RestorationSchema,
    quantity: z.number().int().min(0).max(1),
  })
  .strict();
export const BattleConsumablesSchema = z
  .array(BattleConsumableSchema)
  .max(2)
  .refine(
    (items) => new Set(items.map((item) => item.slot)).size === items.length,
  );
export type BattleConsumable = z.infer<typeof BattleConsumableSchema>;

export function restorationAmount(
  restoration: z.infer<typeof RestorationSchema>,
  target: { health: number; mana: number; maxHealth: number; maxMana: number },
) {
  if (target.health <= 0) return 0;
  const maximum =
    restoration.resource === "health" ? target.maxHealth : target.maxMana;
  return Math.max(
    0,
    Math.min(restoration.amount, maximum - target[restoration.resource]),
  );
}
