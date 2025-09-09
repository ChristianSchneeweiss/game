import { z } from "zod";

export const EnemyTypeSchema = z.union([
  z.literal("goblin"),
  z.literal("skeleton-grunt"),
  z.literal("rotting-corpse"),
  z.literal("wisp-of-regret"),
  z.literal("ghoul-knight-ivern"),
]);
export type EnemyType = z.infer<typeof EnemyTypeSchema>;
