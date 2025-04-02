import { Handler } from "./calculator";
import type {
  BattleManager,
  Entity,
  BattleRound,
  Team,
  SpellResult,
  BattleHandler,
  LifeCycleHooks,
} from "./types";

export class BM implements BattleManager {
  entities: Entity[];
  deadEntities: Map<string, Entity>;
  rounds: BattleRound[];
  handler: BattleHandler;
  lifeCycleHooks: LifeCycleHooks[];
  roundEvents: {
    round: number;
    result: SpellResult[];
    deathEvents: { entityId: string; spellId: string }[];
  }[] = [];

  constructor(entities: Entity[]) {
    this.deadEntities = new Map();
    this.rounds = [];
    this.handler = new Handler(this);
    this.lifeCycleHooks = [];
    this.entities = [];
    for (const entity of entities) {
      this.join(entity);
    }
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
    this.entities.push(entity);

    return true;
  }

  processEntityDeath(entity: Entity, cause: { spellId: string }): void {
    if (!entity.isDead()) return;

    this.entities = this.entities.filter((e) => e.id !== entity.id);
    this.deadEntities.set(entity.id, entity);
    this.roundEvents[this.rounds.length - 1]!.deathEvents.push({
      entityId: entity.id,
      spellId: cause.spellId,
    });
    console.log(`${entity.name} has died`);
  }

  startNextRound(): void {
    const round: BattleRound = {
      round: this.rounds.length,
      order: this.entities
        .sort((a, b) => b.getStat("agility") - a.getStat("agility"))
        .map((e) => e.id),
    };

    this.rounds.push(round);
    this.roundEvents.push({ round: round.round, result: [], deathEvents: [] });

    this.lifeCycleHooks.forEach((hook) => {
      hook.onRoundStart?.();
    });
  }

  endRound(): void {
    this.lifeCycleHooks.forEach((hook) => {
      hook.onRoundEnd?.();
    });
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
    action(currentRound);
  }

  getCurrentRound(): BattleRound {
    const currentRound = this.rounds[this.rounds.length - 1];
    if (!currentRound) {
      throw new Error("No current round");
    }
    return currentRound;
  }

  castSpell(caster: Entity, spellId: string, targetIds: string[]): SpellResult {
    // Find the spell
    const spell = caster.spells.find((s) => s.config.id === spellId);
    if (!spell) {
      return {
        success: false,
        message: `Spell ${spellId} not found for ${caster.name}`,
        affectedTargets: [],
        caster,
        spellId,
      };
    }

    // Find targets
    const targets = targetIds
      .map((id) => this.getEntityById(id))
      .filter((e): e is Entity => e !== undefined);

    if (targets.length === 0 && spell.config.targetType !== "NO_TARGET") {
      return {
        success: false,
        message: `No valid targets found for spell ${spell.config.name}`,
        affectedTargets: [],
        caster,
        spellId,
      };
    }

    return spell.cast(caster, targets);
  }

  fight() {
    while (!this.isGameOver()) {
      this.startNextRound();
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

            this.roundEvents[this.rounds.length - 1]!.result.push(result);

            console.log(prettyPrintSpellResult(result));
          }
        });
      }

      this.endRound();
    }
    const winner = this.getWinningTeam();
    console.log(`Game over! ${winner} wins!`);
  }
}

function prettyPrintSpellResult(result: SpellResult): string {
  let s = `${result.caster.name} casts ${result.spellId}: ${result.message}:
  `;

  if (result.damageDealt) {
    s += `damage taken:
     ${Array.from(result.damageDealt.entries())
       .map(([id, damage]) => `${id}: ${damage}`)
       .join(", ")}`;
  }

  if (result.healingDone) {
    s += `healing done:
     ${Array.from(result.healingDone.entries())
       .map(([id, healing]) => `${id}: ${healing}`)
       .join(", ")}`;
  }

  if (result.effectsApplied) {
    s += `effects applied:
     ${result.effectsApplied.map((effect) => effect.effectType).join(", ")}`;
  }
  return s;
}
