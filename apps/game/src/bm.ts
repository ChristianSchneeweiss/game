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
import {
  SPELL_TARGETING,
  WEAPON_PROFILES,
  weaponProfileFor,
} from "./tactical/catalogue";
import { queryCast, reachableTiles } from "./tactical/queries";
import type {
  CastSelection,
  GridSetup,
  GridState,
  Tile,
} from "./tactical/types";
import {
  TargetingSchema,
  WeaponAttackProfileSchema,
  validateGridSetup,
} from "./tactical/types";

/** Capture authoring defaults before joining, without applying equipment twice. */
export function prepareTacticalEntity(entity: Entity): void {
  const weapon = entity.equipped.WEAPON?.itemType;
  entity.weaponAttackProfile = WeaponAttackProfileSchema.parse(
    entity.weaponAttackProfile ??
      weaponProfileFor(weapon) ??
      WEAPON_PROFILES[entity.isBot ? "enemy-default" : "unarmed"],
  );
  for (const spell of entity.spells) {
    spell.config.targeting = TargetingSchema.parse(
      spell.config.targeting ??
        (spell.config.type === "basic-attack"
          ? entity.weaponAttackProfile.targeting
          : SPELL_TARGETING[spell.config.type]),
    );
  }
}

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
  grid?: GridState;
  revision = 0;
  private activationSequence = 0;
  private effectSequence = 0;
  private finishedActorId?: string;
  private preparedActorId?: string;
  private pendingImpacts: BattleImpact[] = [];

  constructor(
    entities: Entity[],
    battleId: string = nanoid(20),
    setup?: GridSetup,
  ) {
    this.battleId = battleId;
    this.rng = seedrandom(this.battleId, { state: true });
    this.deadEntities = new Map();
    this.rounds = [];
    this.handler = new Handler(this);
    this.lifeCycleHooks = [];
    this.entities = [];
    if (setup)
      this.grid = { ...validateGridSetup(setup, entities), activation: null };
    for (const entity of entities) {
      if (setup) prepareTacticalEntity(entity);
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
    if (this.grid) {
      const { activation, ...setup } = this.grid;
      this.processEvent({ eventType: "GRID_START", data: _.cloneDeep(setup) });
    }
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
    if (this.grid) return null;
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

  private activeEntity(entityId: string): Entity | undefined {
    if (
      !this.grid?.activation ||
      this.grid.activation.entityId !== entityId ||
      this.getCurrentRound().orderQueue[0] !== entityId ||
      this.isGameOver()
    )
      return;
    const entity = this.getEntityById(entityId);
    if (
      !entity ||
      entity.isDead() ||
      entity.activeEffects.some((effect) => effect.preventsAction)
    )
      return;
    return entity;
  }

  moveEntity(entityId: string, destination: Tile): boolean {
    if (!this.activeEntity(entityId) || !this.grid?.activation) return false;
    const grid = this.grid;
    const activation = grid.activation!;
    const move = reachableTiles(
      grid,
      this.entities,
      entityId,
      activation.allowance - activation.spent,
    ).find(({ tile }) => tile.x === destination.x && tile.y === destination.y);
    if (!move || move.path.length === 0) return false;
    const from = { ...grid.positions[entityId]! };
    grid.positions[entityId] = { ...move.tile };
    activation.spent += move.path.length;
    this.revision++;
    this.processEvent({
      eventType: "MOVE",
      data: {
        entityId,
        activationId: activation.id,
        from,
        to: { ...move.tile },
        path: _.cloneDeep(move.path),
        movementSpent: activation.spent,
        movementRemaining: activation.allowance - activation.spent,
        revision: this.revision,
      },
    });
    return true;
  }

  safeCastSpatial(
    entityId: string,
    spellId: string,
    selection: CastSelection,
  ): SpellCastEvent[] | null {
    const caster = this.activeEntity(entityId);
    if (!caster || !this.grid) return null;
    const spell = caster.spells.find((spell) => spell.config.id === spellId);
    if (
      !spell?.castSpatial ||
      !spell.config.targeting ||
      !spell.canCast(caster)
    )
      return null;
    if (
      !queryCast(
        this.grid,
        this.entities,
        entityId,
        spell.config.targeting,
        selection,
      ).legal
    )
      return null;
    const events = spell.castSpatial(caster, selection);
    if (!events) return null;
    this.finishedActorId = entityId;
    events.forEach((event) => this.processEvent(event));
    this.endActivation("cast");
    return events;
  }

  /** Validate a voluntary pass; lifecycle progression remains caller controlled. */
  passTurn(entityId: string): boolean {
    if (!this.activeEntity(entityId)) return false;
    this.finishedActorId = entityId;
    this.endActivation("pass");
    return true;
  }

  private endActivation(reason: "cast" | "pass" | "blocked"): void {
    const activation = this.grid?.activation;
    if (!activation || !this.grid) return;
    this.grid.activation = null;
    if (reason !== "blocked") this.revision++;
    this.processEvent({
      eventType: "ACTIVATION_END",
      data: {
        id: activation.id,
        entityId: activation.entityId,
        reason,
        revision: this.revision,
      },
    });
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
        this.getCurrentRound().orderQueue[0] === currentEntityId &&
        (!this.grid ||
          !entity.activeEffects.some((effect) => effect.preventsAction))
      ) {
        if (this.grid) {
          const movement = entity.getAttribute("movement");
          this.grid.activation = {
            id: `${this.battleId}:activation:${this.activationSequence++}`,
            entityId: entity.id,
            allowance: Number.isFinite(movement)
              ? Math.max(0, Math.floor(movement))
              : 0,
            spent: 0,
          };
          this.processEvent({
            eventType: "ACTIVATION_START",
            data: { ...this.grid.activation },
          });
        }
        return;
      }
    }
  }

  postTurn(
    currentEntityId = this.finishedActorId ??
      this.getCurrentRound().orderQueue[0],
  ) {
    if (this.grid?.activation?.entityId === currentEntityId)
      this.endActivation("blocked");
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
