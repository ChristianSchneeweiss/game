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
  activeEffects: Effect[];
  statModifiers: StatModifier[];
  spells: Spell[];
  battleManager?: BattleManager;

  actionSelectionHooks: ActionSelectionHook[];

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
  extends Pick<RoundLifecycleHooks, "onPreRound" | "onPostRound">,
    TurnLifecycleHooks {
  config: SpellConfig;
  currentCooldown: number;
  battleManager?: BattleManager;

  canCast(caster: Entity): boolean;
  getValidTargets(caster: Entity): Entity[] | null;
  cast(caster: Entity, targets: Entity[]): SpellCastEvent | null;
}

export interface ActionSelectionHook {
  name: string;
  priority: number;

  condition: (self: Entity) => boolean;
  actionSelection: (self: Entity) => ReturnType<Entity["getAction"]> | null;

  serialize(): { name: string; priority: number; data: unknown };
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
  lifeCycleHooks: RoundLifecycleHooks[];
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
