import { z } from "zod";

export const SpellTypeSchema = z.union([
  z.literal("basic-attack"),
  z.literal("fireball"),
  z.literal("single-heal"),
  z.literal("crude-strike"),
  z.literal("festering-blow"),
  z.literal("cinder-wisp"),
  z.literal("vital-strike"),
  z.literal("splinter-shot"),
  z.literal("cinderbrand"),
  z.literal("precise-thrust"),
  z.literal("soulflare"),
  z.literal("charred-chains"),
  z.literal("crushing-blow"),
  z.literal("stone-bark"),
  z.literal("rootgrasp"),
  z.literal("verdant-smite"),
  z.literal("natures-embrace"),
]);
export type SpellType = z.infer<typeof SpellTypeSchema>;
