import { z } from "zod";

export const MAX_ITEM_QUANTITY = 2_147_483_647;
export const ItemQuantitySchema = z
  .number()
  .int()
  .positive()
  .max(MAX_ITEM_QUANTITY);

/** Only an absent legacy quantity means one; null, zero and fractions are invalid. */
export function itemQuantity(data: { quantity?: unknown }): number {
  return ItemQuantitySchema.parse(
    Object.hasOwn(data, "quantity") ? data.quantity : 1,
  );
}
