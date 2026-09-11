import z from "zod";

export const ItemTypeSchema = z.enum([
  "int-armor",
  "iron-sword",
  "iron-cuirass",
  "oakwarden-staff",
]);

export type ItemType = z.infer<typeof ItemTypeSchema>;
