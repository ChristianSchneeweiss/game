import { z } from "zod";
import type { Effect } from "../../types";

export const PassiveTypeSchema = z.union([
  z.literal("armor-up"),
  z.literal("mirror"),
]);

export type PassiveType = z.infer<typeof PassiveTypeSchema>;

export interface PassiveSkill extends Effect {
  passiveType: PassiveType;
}
