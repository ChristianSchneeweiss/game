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
    this.effectTracking.set(effect.id, {
      id: effect.id,
      sourceId: effect.sourceId,
      targetId: effect.targetId,
      round: this.getCurrentRound().round,
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
  }

  start() {
    if (this.rounds.length > 0) return;
    this.startEntityData = _.cloneDeep(this.entities);
    this.onPreRound();
  }

  onPreRound(): void {
    const round: BattleRound = {
      round: this.rounds.length,
      orderQueue: this.getAliveEntities()
        .sort((a, b) => b.getAttribute("agility") - a.getAttribute("agility"))
        .map((e) => e.id),
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

  processEvent(event: TimelineEvent): void {
    this.events.push({ round: this.getCurrentRound().round, event });
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
    this.processEvent({
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

  castSpell(
    caster: Entity,
    spellId: string,
    targetIds: string[]
  ): SpellCastEvent | null {
    const spell = caster.spells.find((s) => s.config.id === spellId);
    if (!spell) {
      return null;
    }

    const targets = targetIds
      .map((id) => this.getEntityById(id))
      .filter((e): e is Entity => e !== undefined);

    const targetType = spell.getTargetType();
    if (
      targets.length === 0 &&
      targetType.enemies === 0 &&
      targetType.allies === 0
    ) {
      return null;
    }

    console.log(
      "casting spell",
      spellId,
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

  castNextSpell(
    entityId: string,
    spellId: string,
    targetIds: string[]
  ): SpellCastEvent | null {
    const currentRound = this.getCurrentRound();
    if (currentRound.orderQueue[0] !== entityId) {
      throw new Error("Entity is not the next in round");
    }

    const entity = this.getEntityById(entityId);
    if (!entity) {
      return null;
    }
    const event = this.castSpell(entity, spellId, targetIds);
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

  // fight() {
  //   while (!this.isGameOver()) {
  //     this.onPreRound();
  //     console.log(`\n`, this.getCurrentRound());

  //     while (this.getCurrentRound().orderQueue.length > 0) {
  //       const casterId = this.getCurrentRound().orderQueue.shift();
  //       if (!casterId) {
  //         throw new Error("No caster found");
  //       }
  //       const caster = this.getEntityById(casterId);
  //       if (!caster) {
  //         throw new Error(`Caster ${casterId} not found`);
  //       }

  //       this.processTurn(caster, (round) => {
  //         const { spell, targets } = caster.getAction();
  //         if (targets.length > 0 || spell.config.targetType === "NO_TARGET") {
  //           const targetIds = targets.length > 0 ? [targets[0]!.id] : [];
  //           const result = this.castSpell(caster, spell.config.id, targetIds);

  //           if (result) {
  //             this.processEvent(result);
  //           }
  //         }
  //       });
  //     }

  //     this.onPostRound();
  //   }
  //   const winner = this.getWinningTeam();
  //   console.log(`Game over! ${winner} wins!`);
  // }
}
