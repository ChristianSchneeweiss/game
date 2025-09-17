import _ from "lodash";
import { nanoid } from "nanoid";
import seedrandom from "seedrandom";
import { Handler } from "./calculator";
import type {
  SpellCastEvent,
  TimelineEvent,
  TimelineEventFull,
} from "./timeline-events";
import type {
  BattleHandler,
  BattleManager,
  BattleRound,
  Effect,
  EffectType,
  Entity,
  RoundLifecycleHooks,
  Spell,
  Team,
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
  rng: seedrandom.PRNG;
  effectTracking: EffectTracking = new Map();
  spellCastBuffer: TimelineEvent[] = [];

  constructor(entities: Entity[], battleId: string = nanoid(20)) {
    this.deadEntities = new Map();
    this.rounds = [];
    this.handler = new Handler(this);
    this.lifeCycleHooks = [];
    this.entities = [];
    for (const entity of entities) {
      this.join(entity);
    }
    this.battleId = battleId;
    this.rng = seedrandom(this.battleId);
  }

  getRNG(): number {
    return this.rng();
  }

  getPRNG(): seedrandom.PRNG {
    return this.rng;
  }

  addEffect(effect: Effect): void {
    this.lifeCycleHooks.push(effect);
    const currentRound = this.getCurrentRoundNumber();
    this.effectTracking.set(effect.id, {
      id: effect.id,
      sourceId: effect.sourceId,
      targetId: effect.targetId,
      round: currentRound,
      duration: effect.duration,
      effectType: effect.effectType,
      description: effect.getDescription(),
    });
  }

  join(entity: Entity): void {
    entity.battleManager = this;
    this.lifeCycleHooks.push(entity);
    this.entities.push(entity);
    entity.spells.forEach((spell) => {
      spell.battleManager = this;
      this.lifeCycleHooks.push(spell);
    });

    if (entity.passiveSkills.length > 0) {
      // we create a fake spell cast event to apply the passive skills
      this.processEvent({
        eventType: "SPELL_CAST",
        data: {
          spellId: entity.id,
          roll: 0,
          isCrit: false,
          effectsApplied: new Map([
            [entity.id, entity.passiveSkills.map((p) => p.id)],
          ]),
        },
      });
      entity.passiveSkills.forEach((passive) => {
        passive.battleManager = this;
        entity.applyEffect(passive);
        passive.onApply?.();
        this.addEffect(passive);
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

    this.lifeCycleHooks.forEach((hook) => {
      hook.onPreRound?.();
    });
  }

  onPostRound(): void {
    this.lifeCycleHooks.forEach((hook) => {
      hook.onPostRound?.();
    });
  }

  addEventToSpellCastBuffer(event: TimelineEvent): void {
    this.spellCastBuffer.push(event);
  }

  processEvent(event: TimelineEvent): void {
    const round = this.getCurrentRoundNumber();
    this.events.push({ round, event });

    if (event.eventType === "SPELL_CAST") {
      this.spellCastBuffer.forEach((event) => this.processEvent(event));
      this.spellCastBuffer = [];
    }
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
      entity.spells.some((spell) => spell.config.id === id)
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
    if (!entity.isDead()) return;

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
      (entity) => !entity.isDead()
    );
    const teamBAlive = this.getTeam("TEAM_B").some(
      (entity) => !entity.isDead()
    );

    return !teamAAlive || !teamBAlive;
  }

  getWinningTeam(): Team | null {
    if (!this.isGameOver()) return null;

    const teamAAlive = this.getTeam("TEAM_A").some(
      (entity) => !entity.isDead()
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
    targetIds: string[]
  ): SpellCastEvent | null {
    const targets = targetIds
      .map((id) => this.getEntityById(id))
      .filter((e): e is Entity => e !== undefined);

    const targetType = spell.getTargetType();

    console.log(
      "casting spell",
      spell.config.id,
      spell.config.cooldown,
      targets.map((t) => t.id)
    );
    const myTeam = caster.team;
    const targetEnemies = targets
      .filter((t) => t.team !== myTeam)
      .slice(0, targetType.enemies);
    const targetAllies = targets
      .filter((t) => t.team === myTeam)
      .slice(0, targetType.allies);
    const allTargets = [...targetEnemies, ...targetAllies];
    return spell.cast(caster, allTargets);
  }

  safeCastSpell(
    entityId: string,
    spellId: string,
    targetIds: string[]
  ): SpellCastEvent | null {
    const currentRound = this.getCurrentRound();
    if (currentRound.orderQueue[0] !== entityId) {
      console.error(
        "Entity is not the next in round",
        entityId,
        currentRound.orderQueue
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
    const event = this.castSpell(entity, spell, targetIds);
    if (event) {
      this.processEvent(event);
    }

    return event;
  }

  preTurn() {
    // we just **read** from the queue here
    const currentEntityId = this.getCurrentRound().orderQueue[0];
    if (!currentEntityId) {
      return;
    }
    const currentEntity = this.getEntityById(currentEntityId);
    if (!currentEntity) {
      return;
    }
    const upkeepEvents = currentEntity.onUpkeep?.();
    if (upkeepEvents) {
      upkeepEvents.forEach((event) => this.processEvent(event));
    }
  }

  postTurn() {
    // we remove from the queue here
    const currentEntityId = this.getCurrentRound().orderQueue.shift();
    if (!currentEntityId) {
      return;
    }
    const currentEntity = this.getEntityById(currentEntityId);
    if (!currentEntity) {
      return;
    }
    const endStepEvents = currentEntity.onEndStep?.();
    if (endStepEvents) {
      endStepEvents.forEach((event) => this.processEvent(event));
    }

    // if we've gone through all the entities in the round, start a new round
    if (this.getCurrentRound().orderQueue.length === 0) {
      this.onPostRound();
      this.onPreRound();
    }
  }

  private calculateOrderQueue(): string[] {
    return this.getAliveEntities()
      .filter((e) => {
        const stunEffects = e.activeEffects.filter(
          (ef) => ef.effectType === "STUN"
        );
        const isStunned = stunEffects.length > 0;
        stunEffects
          .flatMap((ef) => ef.onEndStep?.())
          .filter((e) => !!e)
          .forEach((e) => this.processEvent(e));

        return !isStunned;
      })
      .sort((a, b) => b.getAttribute("agility") - a.getAttribute("agility"))
      .map((e) => e.id);
  }
}
