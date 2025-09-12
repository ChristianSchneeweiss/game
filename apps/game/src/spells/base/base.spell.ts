import type {
  OptionalSpellCastEvent,
  SpellCastEvent,
} from "../../timeline-events";
import type { BattleManager, Entity, Spell, SpellConfig } from "../../types";

export abstract class BaseSpell implements Spell {
  config: SpellConfig;
  currentCooldown: number;
  battleManager?: BattleManager;

  constructor(config: SpellConfig) {
    this.config = config;
    this.currentCooldown = 0;
  }

  onPostRound(): void {
    if (this.currentCooldown > 0) {
      this.battleManager?.processEvent({
        eventType: "REDUCE_COOLDOWN",
        data: {
          spellId: this.config.id,
          amount: 1,
        },
      });
      this.currentCooldown--;
    }
  }

  canCast(caster: Entity): boolean {
    return (
      caster.mana >= this.config.manaCost &&
      this.currentCooldown === 0 &&
      !caster.isDead()
    );
  }

  getValidTargets(caster: Entity): Entity[] {
    if (!this.battleManager) throw new Error("Battle manager not set");
    const allEntities = this.battleManager.getAliveEntities();
    const enemies = allEntities.filter(
      (e) => e.team !== caster.team && !e.isDead()
    );
    const allies = this.battleManager
      .getTeam(caster.team)
      .filter((e) => !e.isDead());
    let targets: Entity[] = [];

    if (this.config.targetType.enemies > 0) {
      targets = enemies;
    }
    if (this.config.targetType.allies > 0) {
      targets = [...targets, ...allies];
    }

    return targets;
  }

  cast(caster: Entity, targets: Entity[]): SpellCastEvent | null {
    if (!this.battleManager) throw new Error("Battle manager not set");
    if (!this.canCast(caster)) {
      return null;
    }

    if (!this.validateTargets(caster, targets)) {
      return null;
    }

    this.processCasting(caster);
    const roll = Math.round(this.battleManager.getRNG() * 20);
    const result = this._cast(caster, targets, this.battleManager, roll);
    if (!result) return null;
    return {
      eventType: "SPELL_CAST",
      data: {
        ...result,
        spellId: this.config.id,
        roll,
      },
    };
  }

  description(caster: Entity) {
    return {
      text: this.textDescription(caster),
      targetType: this.config.targetType,
      cooldown: this.config.cooldown,
      manaCost: this.config.manaCost,
    };
  }

  protected abstract textDescription(caster: Entity): string;

  protected abstract _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number
  ): OptionalSpellCastEvent;

  protected validateTargets(caster: Entity, targets: Entity[]): boolean {
    const { enemies, allies } = this.config.targetType;
    if (enemies === 0 && allies === 0) return true;
    if (targets.length === 0) return false;

    const validTargets = this.getValidTargets(caster);
    return targets.every((target) => validTargets.includes(target));
  }

  protected processCasting(caster: Entity): void {
    caster.mana -= this.config.manaCost;
    // because we already reduce the cooldown on round end in the cast round
    // we need to add 1 to make sure a cooldown of 1 is not the next round but the one after that
    // eg: spell with cooldown 1 cast at round 1 will be available at round 3
    // one round cooldown
    this.currentCooldown =
      this.config.cooldown === 0 ? 0 : this.config.cooldown + 1;
  }
}
