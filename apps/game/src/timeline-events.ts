import z from "zod";

const spellCastEvent = z.object({
  eventType: z.literal("SPELL_CAST"),
  data: z.object({
    spellId: z.string(),
    roll: z.number().int(),
    totalDamage: z.number().int().optional(),
    damageApplied: z.map(z.string(), z.number().int()).optional(),
    healingApplied: z.map(z.string(), z.number().int()).optional(),
    effectsApplied: z.map(z.string(), z.string()).optional(),
  }),
});

export type SpellCastEvent = z.infer<typeof spellCastEvent>;

const deathEvent = z.object({
  eventType: z.literal("DEATH"),
  data: z.object({
    id: z.string(),
  }),
});

const reduceCooldownEvent = z.object({
  eventType: z.literal("REDUCE_COOLDOWN"),
  data: z.object({
    spellId: z.string(),
    amount: z.number().int(),
  }),
});

const healthRegenEvent = z.object({
  eventType: z.literal("HEALTH_REGEN"),
  data: z.object({
    entityId: z.string(),
    amount: z.number().int(),
  }),
});

const manaRegenEvent = z.object({
  eventType: z.literal("MANA_REGEN"),
  data: z.object({
    entityId: z.string(),
    amount: z.number().int(),
  }),
});

type ManaRegenEvent = z.infer<typeof manaRegenEvent>;
type HealthRegenEvent = z.infer<typeof healthRegenEvent>;

const allEvents = z.union([
  spellCastEvent,
  deathEvent,
  reduceCooldownEvent,
  healthRegenEvent,
  manaRegenEvent,
]);

export const timelineEventSchema = z.object({
  round: z.number().int(),
  event: allEvents,
});

export type TimelineEventFull = z.infer<typeof timelineEventSchema>;

export type TimelineEvent = Omit<TimelineEventFull, "round">["event"];

export type EventTypes = z.infer<typeof allEvents>["eventType"];

export type EventData = TimelineEvent["data"];
