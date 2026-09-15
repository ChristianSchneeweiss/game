import { z } from "zod";

export const TierSchema = z.enum(["E", "D", "C", "B", "A", "S"]);
const metadata = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  tier: TierSchema,
});
export const MaterialDefinitionSchema = metadata.strict();
export const ConsumableDefinitionSchema = metadata
  .extend({
    useContexts: z.array(z.enum(["battle", "outside-battle"])).nonempty(),
  })
  .strict();

// Production content is authored here when its names, sources and uses are agreed.
// Contexts describe future use; no effects or loadout allocation exist yet.
export const CONSUMABLE_DEFINITIONS: Record<
  string,
  z.infer<typeof ConsumableDefinitionSchema>
> = {};
export const MATERIAL_DEFINITIONS: Record<
  string,
  z.infer<typeof MaterialDefinitionSchema>
> = {};
