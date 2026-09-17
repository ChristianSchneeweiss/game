import { z } from "zod";

export const AiControlSchema = z.strictObject({
  enabled: z.boolean(),
  prompt: z.string().max(4000),
  allowConsumables: z.boolean(),
});

export type AiControl = z.infer<typeof AiControlSchema>;
export const MANUAL_CONTROL: AiControl = {
  enabled: false,
  prompt: "",
  allowConsumables: true,
};
