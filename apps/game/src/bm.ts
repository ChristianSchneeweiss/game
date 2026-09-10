import _ from "lodash";
import { nanoid } from "nanoid";
import seedrandom from "seedrandom";
import type { BattleHandler, BattleManager, BattleRound } from "./battle-types";
import { Handler } from "./calculator";
import type { Entity, Team } from "./entity-types";
import type { RoundLifecycleHooks } from "./lifecycle-hooks";
import type {
  SpellCastEvent,
  BattleImpact,
  TimelineEvent,
  TimelineEventFull,
} from "./timeline-events";
import type {
  Effect,
  EffectClock,
  EffectOrigin,
  EffectType,
  Spell,
} from "./types";

export type EffectTracking = Map<
  string,
  {
    id: string; // redundant but makes stuff simpler
    sourceId: string;
    targetId: string;
    round: number;
    duration: number;
    effectType: EffectType;
    clock?: EffectClock;
    origin?: EffectOrigin;
    description: string;
  }
>;

export class BM implements BattleManager, RoundLifecycleHooks {
  startEntityData: Entity[] = [];
  entities: Entity[];
  deadEntities: Map<string, Entity>;
  rounds: BattleRound[];
  handler: BattleHandler;
  lifeCycleHooks: RoundLifecycleHooks[];
  events: TimelineEventFull[] = [];
  battleId: string;
  rng: seedrandom.StatefulPRNG<seedrandom.State.Arc4>;
  effectTracking: EffectTracking = new Map();
  spellCastBuffer: TimelineEvent[] = [];
  private effectSequence = 0;
  private finishedActorId?: string;
  private preparedActorId?: string;
  private pendingImpacts: BattleImpact[] = [];

  constructor(entities: Entity[], battleId: string = nanoid(20)) {
    this.battleId = battleId;
    this.rng = seedrandom(this.battleId, { state: true });
    this.deadEntities = new Map();
    this.rounds = [];
    this.handler = new Handler(this);
    this.lifeCycleHooks = [];
    this.entities = [];
    for (const entity of entities) {
      this.join(entity);
    }
  }

  getRNG(): number {
    return this.rng();
  }

  getPRNG(): seedrandom.PRNG {
    return this.rng;
  }

  addEffect(effect: Effect): void {
    if (effect.effectType !== "PASSIVE") {
      // Replay identity is independent of combat RNG and process-local nanoid.
      effect.id = `${this.battleId}:effect:${this.effectSequence++}`;
    }
    this.lifeCycleHooks.push(effect);
    const currentRound = this.getCurrentRoundNumber();
    this.effectTracking.set(effect.id, {
      id: effect.id,
      sourceId: effect.sourceId,
      targetId: effect.targetId,
      round: currentRound,
      duration: effect.duration,
      effectType: effect.effectType,
      clock: effect.clock,
      origin: effect.origin,
      description: effect.getDescription(),
    });
  }

  join(entity: Entity): void {
    entity.battleManager = this;
    this.lifeCycleHooks.push(entity);
    this.entities.push(entity);
    if (entity.isDead()) this.deadEntities.set(entity.id, entity);
    entity.spells.forEach((spell) => {
      spell.battleManager = this;
      this.lifeCycleHooks.push(spell);
    });

    for (const equipment of Object.values(entity.equipped)) {
      equipment.battleManager = this;
      this.lifeCycleHooks.push(equipment);
      equipment.onApply?.();
    }

    if (entity.passiveSkills.length > 0) {
      const applications = entity.passiveSkills.flatMap((passive) => {
        const result = this.handler.effect(passive, passive, entity, entity);
        return result ? [result] : [];
      });
      this.processEvent({
        eventType: "SPELL_CAST",
        data: {
          spellId: entity.id,
          roll: 0,
          origin: "passive",
          ...this.handler.mergeHandlerReturns(applications),
        },
      });
    }
  }

  changeTurnOrder(cb: (currentOrder: string[]) => string[]): void {
    this.getCurrentRound().orderQueue = cb(this.getCurrentRound().orderQueue);
  }

  start() {
    if (this.rounds.length > 0) return;
    this.startEntityData = _.cloneDeep(this.entities);
    this.onPreRound();
  }

  onPreRound(): void {
    const round: BattleRound = {
      round: this.rounds.length,
      orderQueue: this.calculateOrderQueue(),
    };

    this.rounds.push(round);

    [...this.lifeCycleHooks].forEach((hook) => {
      if (this.lifeCycleHooks.includes(hook)) hook.onPreRound?.();
    });
  }

  onPostRound(): void {
    [...this.lifeCycleHooks].forEach((hook) => {
      if (this.lifeCycleHooks.includes(hook)) hook.onPostRound?.();
    });
  }

  addEventToSpellCastBuffer(event: TimelineEvent): void {
    this.spellCastBuffer.push(event);
  }

  processEvent(event: TimelineEvent): void {
    if (
      event.eventType === "SPELL_CAST" ||
      event.eventType === "EFFECT_TRIGGER"
    ) {
      event.data.version = 2;
      event.data.impacts = this.pendingImpacts;
      this.pendingImpacts = [];
    }
    const round = this.getCurrentRoundNumber();
    this.events.push({ round, event });

    if (
      event.eventType === "SPELL_CAST" ||
      event.eventType === "EFFECT_TRIGGER"
    ) {
      const buffered = this.spellCastBuffer;
      this.spellCastBuffer = [];
      buffered.forEach((event) => this.processEvent(event));
    }
  }

  recordImpact(impact: BattleImpact): void {
    this.pendingImpacts.push(impact);
  }

  getTeam(team: Team): Entity[] {
    return this.entities.filter((entity) => entity.team === team);
  }

  getAliveEntities(): Entity[] {
    return this.entities.filter((entity) => !entity.isDead());
  }

  getEntityById(id: string): Entity | undefined {
    return (
      this.entities.find((entity) => entity.id === id) ||
      this.deadEntities.get(id)
    );
  }

  getSpellById(id: string): Spell | undefined {
    const entity = this.entities.find((entity) =>
      entity.spells.some((spell) => spell.config.id === id),
    );
    if (!entity) return undefined;
    return entity.spells.find((spell) => spell.config.id === id);
  }

  reviveEntity(entityId: string, health: number): boolean {
    const entity = this.deadEntities.get(entityId);
    if (!entity) return false;

    this.deadEntities.delete(entityId);

    entity.health = Math.min(health, entity.maxHealth);

    return true;
  }

  processEntityDeath(entity: Entity, cause: { spellId: string }): void {
    if (!entity.isDead() || this.deadEntities.has(entity.id)) return;

    this.deadEntities.set(entity.id, entity);
    this.addEventToSpellCastBuffer({
      eventType: "DEATH",
      data: { id: entity.id },
    });
    console.log(`${entity.name} has died`);

    // on death we remove the entity from the order queue. so they dont act anymore
    this.getCurrentRound().orderQueue =
      this.getCurrentRound().orderQueue.filter((id) => id !== entity.id);
  }

  isGameOver(): boolean {
    const teamAAlive = this.getTeam("TEAM_A").some(
      (entity) => !entity.isDead(),
    );
    const teamBAlive = this.getTeam("TEAM_B").some(
      (entity) => !entity.isDead(),
    );

    return !teamAAlive || !teamBAlive;
  }

  getWinningTeam(): Team | null {
    if (!this.isGameOver()) return null;

    const teamAAlive = this.getTeam("TEAM_A").some(
      (entity) => !entity.isDead(),
    );
    return teamAAlive ? "TEAM_A" : "TEAM_B";
  }

  processTurn(entity: Entity, action: (round: BattleRound) => void): void {
    if (entity.isDead()) {
      return;
    }

    const currentRound = this.getCurrentRound();
    const upkeepEvents = entity.onUpkeep?.();
    if (upkeepEvents) {
      upkeepEvents.forEach((event) => this.processEvent(event));
    }
    const actionEvents = entity.onActionSelection?.();
    if (actionEvents) {
      actionEvents.forEach((event) => this.processEvent(event));
    }
    action(currentRound);
    const endStepEvents = entity.onEndStep?.();
    if (endStepEvents) {
      endStepEvents.forEach((event) => this.processEvent(event));
    }
  }

  getCurrentRound(): BattleRound {
    const currentRound = this.rounds[this.rounds.length - 1];
    if (!currentRound) {
      throw new Error("No current round");
    }
    return currentRound;
  }

  getCurrentRoundNumber(): number {
    const currentRound = this.rounds[this.rounds.length - 1];
    if (!currentRound) {
      return 0;
    }
    return this.rounds.length - 1;
  }

  private castSpell(
    caster: Entity,
    spell: Spell,
    targetIds: string[],
  ): SpellCastEvent[] | null {
    const targets: Entity[] = [];
    for (const id of targetIds) {
      const target = this.getEntityById(id);
      if (!target) return null;
      targets.push(target);
    }
    return spell.cast(caster, targets);
  }

  safeCastSpell(
    entityId: string,
    spellId: string,
    targetIds: string[],
  ): SpellCastEvent[] | null {
    const currentRound = this.getCurrentRound();
    if (currentRound.orderQueue[0] !== entityId) {
      console.error(
        "Entity is not the next in round",
        entityId,
        currentRound.orderQueue,
      );
      return null;
    }

    const entity = this.getEntityById(entityId);
    if (!entity) {
      return null;
    }
    const spell = entity.spells.find((s) => s.config.id === spellId);
    if (!spell) {
      return null;
    }
    const events = this.castSpell(entity, spell, targetIds);
    if (events) {
      this.finishedActorId = entityId;
      events.forEach((event) => this.processEvent(event));
    }

    return events;
  }

  preTurn() {
    while (!this.isGameOver()) {
      const currentEntityId = this.getCurrentRound().orderQueue[0];
      if (!currentEntityId) {
        this.advanceRound();
        continue;
      }
      const entity = this.getEntityById(currentEntityId);
      if (
        !entity ||
        entity.isDead() ||
        entity.activeEffects.some((effect) => effect.preventsAction)
      ) {
        // Blocked turns still consume the actor's turn clock. Charge callbacks
        // may change liveness and the queue; re-read both before any upkeep.
        this.postTurn(currentEntityId);
        continue;
      }
      if (this.preparedActorId === currentEntityId) return;
      this.preparedActorId = currentEntityId;
      entity.onUpkeep?.()?.forEach((event) => this.processEvent(event));
      if (
        !entity.isDead() &&
        this.getCurrentRound().orderQueue[0] === currentEntityId
      )
        return;
    }
  }

  postTurn(
    currentEntityId = this.finishedActorId ??
      this.getCurrentRound().orderQueue[0],
  ) {
    this.finishedActorId = undefined;
    this.preparedActorId = undefined;
    if (!currentEntityId) {
      this.advanceRound();
      return;
    }
    const queue = this.getCurrentRound().orderQueue;
    const index = queue.indexOf(currentEntityId);
    if (index !== -1) queue.splice(index, 1);
    const currentEntity = this.getEntityById(currentEntityId);
    if (currentEntity && !currentEntity.isDead()) {
      currentEntity.onEndStep?.()?.forEach((event) => this.processEvent(event));
    }

    // if we've gone through all the entities in the round, start a new round
    if (this.getCurrentRound().orderQueue.length === 0) {
      this.advanceRound();
    }
  }

  private advanceRound() {
    if (this.isGameOver()) return;
    this.onPostRound();
    if (!this.isGameOver()) this.onPreRound();
  }

  private calculateOrderQueue(): string[] {
    return this.getAliveEntities()
      .sort((a, b) => b.getAttribute("agility") - a.getAttribute("agility"))
      .map((e) => e.id);
  }
}
