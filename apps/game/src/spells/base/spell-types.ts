import { z } from "zod";

export const SpellTypeSchema = z.union([
  z.literal("basic-attack"),
  z.literal("fireball"),
  z.literal("single-heal"),
  z.literal("crude-strike"),
  z.literal("festering-blow"),
  z.literal("cinder-wisp"),
  z.literal("vital-strike"),
]);
export type SpellType = z.infer<typeof SpellTypeSchema>;
