import { z } from "zod";
import type { Effect, Tier } from "../../types";

export const PassiveTypeSchema = z.union([
  z.literal("armor-up"),
  z.literal("thorn-carapace"),
  z.literal("blessed-fortune"),
  z.literal("bloodfang"),
  z.literal("soulleech"),
  z.literal("mystic-flow"),
  z.literal("vital-wellspring"),
  z.literal("stoneform-resolve"),
  z.literal("titans-resurgence"),
  z.literal("keen-instincts"),
]);

export type PassiveType = z.infer<typeof PassiveTypeSchema>;

export interface PassiveSkill extends Effect {
  passiveType: PassiveType;
  tier: Tier;
}
