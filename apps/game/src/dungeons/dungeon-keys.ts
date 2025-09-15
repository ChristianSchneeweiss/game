import { z } from "zod";

export const DungeonKeySchema = z.union([
  z.literal("dungeon1"),
  z.literal("crypt-of-forgotten-echoes"),
  z.literal("trial-of-the-ashen"),
  z.literal("trial-of-the-nature"),
  z.literal("trial-of-the-storm"),
  z.literal("trial-of-the-tides"),
]);
export type DungeonKey = z.infer<typeof DungeonKeySchema>;
