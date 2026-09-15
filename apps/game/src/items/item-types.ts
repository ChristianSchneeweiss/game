import { z } from "zod";
import { getItemDefinition, type ItemType } from "./catalog";
export type { ItemType, StackableItemType } from "./catalog";

export const ItemTypeSchema = z.string().transform((type, ctx): ItemType => {
  try {
    return getItemDefinition(type).type;
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : "Invalid item type",
    });
    return z.NEVER;
  }
});
