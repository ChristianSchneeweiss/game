import { z } from "zod";

export const TierSchema = z.enum(["E", "D", "C", "B", "A", "S"]);
const metadata = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  tier: TierSchema,
});
export const MaterialDefinitionSchema = metadata.strict();
export const RestorationSchema = z
  .object({
    resource: z.enum(["health", "mana"]),
    amount: z.number().int().positive(),
  })
  .strict();
export const ConsumableDefinitionSchema = metadata
  .extend({
    useContexts: z.array(z.enum(["battle", "outside-battle"])).nonempty(),
    restoration: RestorationSchema,
  })
  .strict();

export const CONSUMABLE_DEFINITIONS: Record<
  string,
  z.infer<typeof ConsumableDefinitionSchema>
> = {
  "healing-potion": {
    name: "Healing Potion",
    description:
      "Restore up to 40 health to a living character. In battle, drink it yourself as your action; outside battle, use it on your character in an ongoing expedition.",
    tier: "E",
    useContexts: ["battle", "outside-battle"],
    restoration: { resource: "health", amount: 40 },
  },
  "mana-potion": {
    name: "Mana Potion",
    description:
      "Restore up to 25 mana to a living character. In battle, drink it yourself as your action; outside battle, use it on your character in an ongoing expedition.",
    tier: "D",
    useContexts: ["battle", "outside-battle"],
    restoration: { resource: "mana", amount: 25 },
  },
};
export const MATERIAL_DEFINITIONS: Record<
  string,
  z.infer<typeof MaterialDefinitionSchema>
> = {
  "bone-shard": {
    name: "Bone Shard",
    description:
      "A pale fragment recovered from an undead guardian. Its surface is etched with faded runes.",
    tier: "E",
  },
  "living-resin": {
    name: "Living Resin",
    description:
      "Amber sap from an awakened tree. It stays warm long after leaving the forest.",
    tier: "D",
  },
  "storm-scale": {
    name: "Storm Scale",
    description: "A small draconic scale that crackles faintly when touched.",
    tier: "C",
  },
};
