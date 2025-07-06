import { z } from "zod";

export type Team = "TEAM_A" | "TEAM_B";

export interface EntityAttributes {
  strength: number;
  intelligence: number;
  vitality: number;
  agility: number;
}

export type DamageType = "PHYSICAL" | "FIRE" | "ICE" | "LIGHTNING" | "POISON";

export type EffectType =
  | "BUFF"
  | "DEBUFF"
  | "DOT"
  | "HOT"
  | "CURSE"
  | "STUN"
  | "CONTROL"
  | "SHIELD";

export type ModifierOperation = "ADD" | "MULTIPLY";

export type TargetType =
  | "SELF"
  | "SINGLE_ALLY"
  | "SINGLE_ENEMY"
  | "ALL_ALLIES"
  | "ALL_ENEMIES"
  | "DEAD_ALLY"
  | "AREA"
  | "NO_TARGET";

export interface StatModifier {
  id: string;
  attribute: keyof EntityAttributes;
  value: number;
  operation: ModifierOperation;
}

export interface LifeCycleHooks {
  onRoundStart?: () => void;
  onRoundEnd?: () => void;
  onApply?: () => void;
  onRemove?: () => void;
}

export interface Effect extends LifeCycleHooks {
  effectType: EffectType;
  duration: number;
  source: Entity;
  target: Entity;
  spellSource: Spell;
  battleHandler?: BattleHandler;

  // ** interaction hooks **
  beforeTakingDamage(damage: number): number;
  beforeTakingHealing(healing: number): number;
  beforeTakingEffect(effect: Effect): Effect | null;

  beforeDealingDamage(damage: number): number;
  beforeDealingHealing(healing: number): number;
  beforeDealingEffect(effect: Effect): Effect | null;
}

export interface Entity
  extends Pick<LifeCycleHooks, "onRoundStart" | "onRoundEnd"> {
  id: string;
  name: string;
  team: Team;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  baseAttributes: EntityAttributes;
  activeEffects: Effect[];
  statModifiers: StatModifier[];
  spells: Spell[];
  battleManager?: BattleManager;

  // todo: do i need them?
  applyDamage(amount: number, type: DamageType, source: Entity): void;
  applyHealing(amount: number, source: Entity): void;
  applyEffect(effect: Effect): void;
  removeEffect(effect: Effect): void;

  isDead(): boolean;
  getStat(attribute: keyof EntityAttributes): number;
  getAction(): { spell: Spell; targets: Entity[] };
}

export interface Spell
  extends Pick<LifeCycleHooks, "onRoundStart" | "onRoundEnd"> {
  config: SpellConfig;
  currentCooldown: number;
  battleManager?: BattleManager;

  canCast(caster: Entity): boolean;
  getValidTargets(caster: Entity): Entity[] | null;
  cast(caster: Entity, targets: Entity[]): SpellCastEvent | null;
}

export interface SpellConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  manaCost: number;
  cooldown: number;
  targetType: TargetType;
}

export interface BattleManager {
  entities: Entity[];
  deadEntities: Map<string, Entity>;
  rounds: BattleRound[];
  handler: BattleHandler;
  lifeCycleHooks: LifeCycleHooks[];
  events: TimelineEventFull[];

  getTeam(team: Team): Entity[];
  getAliveEntities(): Entity[];
  getEntityById(id: string): Entity | undefined;
  reviveEntity(entityId: string, health: number): boolean;
  getCurrentRound(): BattleRound;
  join(entity: Entity): void;
  processEntityDeath(entity: Entity, cause: { spellId: string }): void;
  processEvent(event: TimelineEvent): void;
}

export interface BattleRound {
  round: number;
  order: string[];
}

export interface BattleHandler {
  damage(
    spell: Spell | Effect,
    amount: number,
    type: DamageType,
    source: Entity,
    target: Entity
  ): number;
  healing(
    spell: Spell | Effect,
    amount: number,
    source: Entity,
    target: Entity
  ): number;
  effect(
    spell: Spell | Effect,
    effect: Effect,
    source: Entity,
    target: Entity
  ): Effect | null;
}

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

const allEvents = z.union([spellCastEvent, deathEvent, reduceCooldownEvent]);

export const timelineEventSchema = z.object({
  round: z.number().int(),
  event: allEvents,
});

export type TimelineEventFull = z.infer<typeof timelineEventSchema>;

export type TimelineEvent = Omit<TimelineEventFull, "round">["event"];

export type EventTypes = z.infer<typeof allEvents>["eventType"];

export type EventData = TimelineEvent["data"];
