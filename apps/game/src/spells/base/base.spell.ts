import type { BattleManager } from "../../battle-types";
import type { Entity } from "../../entity-types";
import type {
  OptionalSpellCastEvent,
  SpellCastEvent,
} from "../../timeline-events";
import type { Spell, SpellConfig, TargetType } from "../../types";
import { completeSelection, legalTargets, targetSelection } from "./targets";

export abstract class BaseSpell implements Spell {
  config: SpellConfig;
  currentCooldown: number;
  battleManager: BattleManager;

  constructor(config: SpellConfig) {
    this.config = config;
    this.currentCooldown = 0;
    this.battleManager = undefined!;
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
    return legalTargets(
      caster,
      this.battleManager.entities,
      this.getTargetType(),
    );
  }

  cast(caster: Entity, targets: Entity[]): SpellCastEvent[] | null {
    if (!this.battleManager) throw new Error("Battle manager not set");
    if (!this.canCast(caster)) {
      console.error("cannot cast", this.config.id, this.config.cooldown);
      return null;
    }

    if (!this.validateTargets(caster, targets)) {
      return null;
    }

    // TODO maybe we should think about this better.
    // but the 0,0 is an edge case because you would have no target and spells get super confused by this
    // if the target type is 0,0, its a self spell
    if (targets.length === 0) {
      targets = [caster];
    }

    const roll = this.getRoll(caster);
    this.processCasting(caster);
    const result = this._cast(caster, targets, this.battleManager, roll);
    const outcomes = (Array.isArray(result) ? result : [result]).filter(
      (outcome) => outcome !== null,
    );
    // A legal cast commits even when none of its optional effects succeeds.
    if (outcomes.length === 0) outcomes.push({ isCrit: false });
    return outcomes.map((outcome, index) => ({
      eventType: "SPELL_CAST",
      data: {
        ...outcome,
        version: 2,
        origin: "cast",
        spellId: this.config.id,
        roll,
        ...(index === 0
          ? {
              payment: {
                casterId: caster.id,
                manaSpent: this.config.manaCost,
                cooldown: this.currentCooldown,
              },
            }
          : {}),
      },
    }));
  }

  description(caster: Entity) {
    return {
      text: this.textDescription(caster),
      targetType: this.getTargetType(),
      cooldown: this.config.cooldown,
      manaCost: this.config.manaCost,
    };
  }

  protected abstract textDescription(caster: Entity): string;

  protected abstract _cast(
    caster: Entity,
    targets: Entity[],
    battleManager: BattleManager,
    roll: number,
  ): OptionalSpellCastEvent | OptionalSpellCastEvent[];

  protected validateTargets(caster: Entity, targets: Entity[]): boolean {
    const selection = targetSelection(caster, this);
    const ids =
      selection.self && targets.length === 0
        ? [caster.id]
        : targets.map((target) => target.id);
    return completeSelection(caster, ids, selection);
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

  /**
   * @returns A random number between 0 and 1
   */
  protected getRNG(): number {
    return this.battleManager.getRNG();
  }

  getTargetType(): TargetType {
    return this.config.targetType;
  }

  protected getRoll(caster: Entity) {
    let roll = Math.round(this.getRNG() * 20);
    const blessed = caster.getAttribute("blessed");
    roll = Math.min(roll + blessed, 20);
    return roll;
  }
}
