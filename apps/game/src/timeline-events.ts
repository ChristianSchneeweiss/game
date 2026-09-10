import z from "zod";

const payment = z.object({
  casterId: z.string(),
  manaSpent: z.number().int(),
  cooldown: z.number().int(),
});

const provenance = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("spell"), id: z.string(), sourceId: z.string() }),
  z.object({ kind: z.literal("effect"), id: z.string(), sourceId: z.string() }),
]);

// Resource changes are recorded at the mutation boundary, including nested
// reactions. Summary maps remain useful for cues and for reading old battles.
const impact = z.object({
  cause: provenance,
  targetId: z.string(),
  healthChange: z.number().int(),
  isCrit: z.boolean(),
});
export type BattleImpact = z.infer<typeof impact>;

const spellCastEvent = z.object({
  eventType: z.literal("SPELL_CAST"),
  data: z.object({
    spellId: z.string(),
    roll: z.number().int(),
    isCrit: z.boolean(),
    version: z.literal(2).optional(),
    payment: payment.optional(),
    origin: z.enum(["cast", "delayed", "passive"]).optional(),
    impacts: z.array(impact).optional(),
    totalDamage: z.number().int().optional(),
    damageApplied: z.map(z.string(), z.number().int()).optional(),
    healingApplied: z.map(z.string(), z.number().int()).optional(),
    effectsApplied: z.map(z.string(), z.array(z.string())).optional(),
  }),
});

const EffectTriggerEvent = z.object({
  eventType: z.literal("EFFECT_TRIGGER"),
  data: z.object({
    effectId: z.string(),
    version: z.literal(2).optional(),
    impacts: z.array(impact).optional(),
    damageApplied: z.map(z.string(), z.number().int()).optional(),
    healingApplied: z.map(z.string(), z.number().int()).optional(),
    effectsApplied: z.map(z.string(), z.array(z.string())).optional(),
  }),
});

export type SpellCastEvent = z.infer<typeof spellCastEvent>;
export type EffectTriggerEvent = z.infer<typeof EffectTriggerEvent>;

export type OptionalSpellCastEvent = Omit<
  SpellCastEvent["data"],
  "spellId" | "roll"
> | null;

const effectRemovalEvent = z.object({
  eventType: z.literal("EFFECT_REMOVAL"),
  data: z.object({
    effectId: z.string(),
  }),
});

export type EffectRemovalEvent = z.infer<typeof effectRemovalEvent>;

const deathEvent = z.object({
  eventType: z.literal("DEATH"),
  data: z.object({
    id: z.string(),
  }),
});

const reduceCooldownEvent = z.object({
  eventType: z.literal("REDUCE_SPELL_COOLDOWN"),
  data: z.array(
    z.object({
      spellId: z.string(),
      amount: z.number().int(),
    }),
  ),
});

const regenEvent = z.object({
  eventType: z.literal("REGEN"),
  data: z.object({
    entityId: z.string(),
    healthRegen: z.number().int(),
    manaRegen: z.number().int(),
  }),
});

const allEvents = z.union([
  spellCastEvent,
  EffectTriggerEvent,
  effectRemovalEvent,
  deathEvent,
  reduceCooldownEvent,
  regenEvent,
]);

export const timelineEventSchema = z.object({
  round: z.number().int(),
  event: allEvents,
});

export type TimelineEventFull = z.infer<typeof timelineEventSchema>;

export type TimelineEvent = Omit<TimelineEventFull, "round">["event"];

export type EventTypes = z.infer<typeof allEvents>["eventType"];

export type EventData = TimelineEvent["data"];
