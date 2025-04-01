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
  cast(caster: Entity, targets: Entity[]): SpellResult;
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

export interface SpellResult {
  caster: Entity;
  spellId: string;
  success: boolean;
  message: string;
  affectedTargets: Entity[];
  roll?: number;
  damageDealt?: Map<string, number>;
  healingDone?: Map<string, number>;
  effectsApplied?: Effect[];
  entitiesSummoned?: Entity[];
  entitiesRevived?: Entity[];
}

export interface BattleManager {
  entities: Entity[];
  deadEntities: Map<string, Entity>;
  rounds: BattleRound[];
  handler: BattleHandler;
  lifeCycleHooks: LifeCycleHooks[];

  getTeam(team: Team): Entity[];
  getAliveEntities(): Entity[];
  getEntityById(id: string): Entity | undefined;
  reviveEntity(entityId: string, health: number): boolean;
  getCurrentRound(): BattleRound;
  join(entity: Entity): void;
  processEntityDeath(entity: Entity): void;
}

export interface BattleRound {
  round: number;
  order: string[];
}

export interface BattleHandler {
  damage(
    amount: number,
    type: DamageType,
    source: Entity,
    target: Entity
  ): number;
  healing(amount: number, source: Entity, target: Entity): number;
  effect(effect: Effect, source: Entity, target: Entity): Effect | null;
}
