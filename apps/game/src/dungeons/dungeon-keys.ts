import { z } from "zod";

export const DungeonKeySchema = z.union([
  z.literal("dungeon1"),
  z.literal("crypt-of-forgotten-echoes"),
  z.literal("trial-of-the-ashen"),
  z.literal("trial-of-the-nature"),
]);
export type DungeonKey = z.infer<typeof DungeonKeySchema>;
