import { z } from "zod";

export const SpellTypeSchema = z.union([
  z.literal("autoattack"),
  z.literal("fireball"),
  z.literal("single-heal"),
  z.literal("crude-strike"),
  z.literal("festering-blow"),
  z.literal("cinder-wisp"),
  z.literal("vital-strike"),
]);
export type SpellType = z.infer<typeof SpellTypeSchema>;
