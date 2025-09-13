import type seedrandom from "seedrandom";
import z from "zod";
import { SpellTypeSchema, type SpellType } from "./spells/base/spell-types";
import type {
  SpellCastEvent,
  TimelineEvent,
  TimelineEventFull,
} from "./timeline-events";

export type Team = "TEAM_A" | "TEAM_B";

export interface EntityAttributes {
  strength: number;
  intelligence: number;
  vitality: number;
  agility: number;
}

export interface SpecialAttributes {
  lifesteal: number;
  omnivamp: number;
  armor: number;
  magicResistance: number;
  affinities: number;
  armorPenetration: number;
  magicPenetration: number;
  healthRegen: number;
  manaRegen: number;
  blessed: number;
  critChance: number;
}

export type AllAttributeKeys = keyof EntityAttributes | keyof SpecialAttributes;

export type DamageType = "PHYSICAL" | "MAGICAL";

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

export type TargetType = {
  enemies: number;
  allies: number;
};

export interface AttributeModifier {
  id: string;
  attribute: AllAttributeKeys;
  value: number;
  operation: ModifierOperation;
}

export interface RoundLifecycleHooks {
  onPreRound?: () => void;
  onPostRound?: () => void;

  // todo move these?
  onApply?: () => void;
  onRemove?: () => void;
}

export interface TurnLifecycleHooks {
  onUpkeep?: () => TimelineEvent[] | null;
  onActionSelection?: () => TimelineEvent[] | null;
  onEndStep?: () => TimelineEvent[] | null;
}

export interface Effect extends RoundLifecycleHooks, TurnLifecycleHooks {
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
  extends Pick<RoundLifecycleHooks, "onPreRound" | "onPostRound">,
    TurnLifecycleHooks {
  id: string;
  name: string;
  team: Team;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  baseAttributes: EntityAttributes;
  baseSpecialAttributes: SpecialAttributes;
  activeEffects: Effect[];
  attributeModifiers: AttributeModifier[];
  spells: Spell[];
  battleManager?: BattleManager;
  isBot: boolean;

  // todo: do i need them?
  applyDamage(amount: number, type: DamageType, source: Entity): void;
  applyHealing(amount: number, source: Entity): void;
  applyEffect(effect: Effect): void;
  removeEffect(effect: Effect): void;

  isDead(): boolean;
  getAttribute(attribute: AllAttributeKeys): number;
}

export interface SpellDescription {
  text: string;
  targetType: TargetType;
  cooldown: number;
  manaCost: number;
}

export interface Spell
  extends Pick<RoundLifecycleHooks, "onPreRound" | "onPostRound">,
    TurnLifecycleHooks {
  config: SpellConfig;
  currentCooldown: number;
  battleManager?: BattleManager;

  canCast(caster: Entity): boolean;
  getValidTargets(caster: Entity): Entity[] | null;
  cast(caster: Entity, targets: Entity[]): SpellCastEvent | null;
  description(caster: Entity): SpellDescription;

  /** allows to override the target type for a spell. So we can have dynamic target types based on stuff */
  getTargetType(): TargetType;
}

export interface SpellConfig {
  id: string;
  type: SpellType;
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
  lifeCycleHooks: RoundLifecycleHooks[];
  events: TimelineEventFull[];

  getRNG(): number;
  getPRNG(): seedrandom.PRNG;
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
  orderQueue: string[];
}

export type HandlerReturn = Omit<SpellCastEvent["data"], "roll" | "spellId">;

export interface BattleHandler {
  damage(
    spell: Spell | Effect,
    amount: number,
    type: DamageType,
    source: Entity,
    target: Entity
  ): HandlerReturn;
  healing(
    spell: Spell | Effect,
    amount: number,
    source: Entity,
    target: Entity
  ): HandlerReturn;
  effect(
    spell: Spell | Effect,
    effect: Effect,
    source: Entity,
    target: Entity
  ): HandlerReturn | null;

  mergeHandlerReturns(returns: HandlerReturn[]): HandlerReturn;
}

export interface Loot {
  items: LootEntity[];
  gold: number;
}

export const LootEntitySchema = z.object({
  type: z.enum(["SPELL"]),
  dropRate: z.number(),
  data: z.object({
    spellType: SpellTypeSchema,
  }),
});

export type LootEntity = z.infer<typeof LootEntitySchema>;
