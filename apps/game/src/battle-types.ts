import type seedrandom from "seedrandom";
import type { Entity, Team } from "./entity-types";
import type { RoundLifecycleHooks } from "./lifecycle-hooks";
import type {
  SpellCastEvent,
  TimelineEvent,
  TimelineEventFull,
} from "./timeline-events";
import type { DamageType, Effect, Spell } from "./types";

export interface BattleManager {
  battleId: string;
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
  getSpellById(id: string): Spell | undefined;
  reviveEntity(entityId: string, health: number): boolean;
  getCurrentRound(): BattleRound;
  join(entity: Entity): void;
  processEntityDeath(entity: Entity, cause: { spellId: string }): void;
  processEvent(event: TimelineEvent): void;
  changeTurnOrder(cb: (currentOrder: string[]) => string[]): void;

  addEffect(effect: Effect): void;

  /**
   * Add an event to the spell cast buffer.
   * Because some events need to be processed in order **after** the spell cast event.
   * Like Death and effect removal (eg 1 turn stun gets instantly removed, but needs to happen after the spell cast)
   */
  addEventToSpellCastBuffer(event: TimelineEvent): void;
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
    target: Entity,
  ): HandlerReturn;
  healing(
    spell: Spell | Effect,
    amount: number,
    source: Entity,
    target: Entity,
  ): HandlerReturn;
  effect(
    spell: Spell | Effect,
    effect: Effect,
    source: Entity,
    target: Entity,
  ): HandlerReturn | null;

  mergeHandlerReturns(returns: HandlerReturn[]): HandlerReturn;
}
