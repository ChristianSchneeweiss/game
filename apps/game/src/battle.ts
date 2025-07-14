import _ from "lodash";
import { nanoid } from "nanoid";
import { Handler } from "./calculator";
import type {
  BattleHandler,
  BattleManager,
  BattleRound,
  Entity,
  RoundLifecycleHooks,
  SpellCastEvent,
  Team,
  TimelineEvent,
  TimelineEventFull,
} from "./types";

export class BM implements BattleManager, RoundLifecycleHooks {
  startEntityData: Entity[] = [];
  entities: Entity[];
  deadEntities: Map<string, Entity>;
  rounds: BattleRound[];
  handler: BattleHandler;
  lifeCycleHooks: RoundLifecycleHooks[];
  events: TimelineEventFull[] = [];
  battleId: string;

  constructor(entities: Entity[]) {
    this.deadEntities = new Map();
    this.rounds = [];
    this.handler = new Handler(this);
    this.lifeCycleHooks = [];
    this.entities = [];
    for (const entity of entities) {
      this.join(entity);
    }
    this.battleId = nanoid(20);
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

  onPreRound(): void {
    const round: BattleRound = {
      round: this.rounds.length,
      order: this.getAliveEntities()
        .sort((a, b) => b.getStat("agility") - a.getStat("agility"))
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

    if (targets.length === 0 && spell.config.targetType !== "NO_TARGET") {
      return null;
    }

    return spell.cast(caster, targets);
  }

  fight() {
    this.startEntityData = _.cloneDeep(this.entities);

    while (!this.isGameOver()) {
      this.onPreRound();
      console.log(`\n`, this.getCurrentRound());

      while (this.getCurrentRound().order.length > 0) {
        const casterId = this.getCurrentRound().order.shift();
        if (!casterId) {
          throw new Error("No caster found");
        }
        const caster = this.getEntityById(casterId);
        if (!caster) {
          throw new Error(`Caster ${casterId} not found`);
        }

        this.processTurn(caster, (round) => {
          const { spell, targets } = caster.getAction();
          if (targets.length > 0 || spell.config.targetType === "NO_TARGET") {
            const targetIds = targets.length > 0 ? [targets[0]!.id] : [];
            const result = this.castSpell(caster, spell.config.id, targetIds);

            if (result) {
              this.processEvent(result);
            }
          }
        });
      }

      this.onPostRound();
    }
    const winner = this.getWinningTeam();
    console.log(`Game over! ${winner} wins!`);
  }
}
