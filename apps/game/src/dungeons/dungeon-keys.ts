import { z } from "zod";

export const DungeonKeySchema = z.union([
  z.literal("dungeon1"),
  z.literal("crypt-of-forgotten-echoes"),
]);
export type DungeonKey = z.infer<typeof DungeonKeySchema>;
