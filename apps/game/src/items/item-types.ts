import z from "zod";

export const ItemTypeSchema = z.union([z.literal("int-armor")]);

export type ItemType = z.infer<typeof ItemTypeSchema>;
