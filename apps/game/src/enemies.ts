import { z } from "zod";

export const EnemyTypeSchema = z.union([
  z.literal("goblin"),
  z.literal("orc"),
  z.literal("troll"),
  z.literal("dragon"),
]);
export type EnemyType = z.infer<typeof EnemyTypeSchema>;
