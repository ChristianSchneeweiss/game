import type { BattleManager } from "../../battle-types";
import type { Entity } from "../../entity-types";
import type {
  OptionalSpellCastEvent,
  SpellCastEvent,
} from "../../timeline-events";
import type { Spell, SpellConfig, TargetType } from "../../types";
import { completeSelection, legalTargets, targetSelection } from "./targets";
import { queryCast } from "../../tactical/queries";
import type { CastSelection } from "../../tactical/types";

export abstract class BaseSpell implements Spell {
  config: SpellConfig;
  currentCooldown: number;
  battleManager: BattleManager;
  private spatialSelection?: CastSelection;

  constructor(config: SpellConfig) {
    this.config = config;
    this.currentCooldown = 0;
    this.battleManager = undefined!;
  }

  canCast(caster: Entity): boolean {
    return (
      caster.mana >= this.config.manaCost &&
      this.currentCooldown === 0 &&
      !caster.isDead() &&
      (!this.battleManager?.grid ||
        !caster.activeEffects.some((effect) => effect.preventsAction))
    );
  }

  getValidTargets(caster: Entity): Entity[] {
    if (!this.battleManager) throw new Error("Battle manager not set");
    if (this.battleManager.grid && this.config.targeting) {
      const candidates = queryCast(
        this.battleManager.grid,
        this.battleManager.entities,
        caster.id,
        { aim: "global", recipients: this.config.targeting.recipients },
        { aim: "global" },
      );
      const ids = new Set(candidates.recipientIds);
      return this.battleManager.entities.filter((target) => ids.has(target.id));
    }
    return legalTargets(
      caster,
      this.battleManager.entities,
      this.getTargetType(),
    );
  }

  cast(caster: Entity, targets: Entity[]): SpellCastEvent[] | null {
    if (!this.battleManager) throw new Error("Battle manager not set");
    // A rules-v2 cast must resolve its own spatial selection, never trust IDs.
    if (this.battleManager.grid) return null;
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

    return this.executeCast(caster, targets);
  }

  castSpatial(
    caster: Entity,
    selection: CastSelection,
  ): SpellCastEvent[] | null {
    const grid = this.battleManager?.grid;
    if (
      !grid?.activation ||
      grid.activation.entityId !== caster.id ||
      this.battleManager.getCurrentRound().orderQueue[0] !== caster.id ||
      !this.config.targeting ||
      !this.canCast(caster)
    )
      return null;
    const query = queryCast(
      grid,
      this.battleManager.entities,
      caster.id,
      this.config.targeting,
      selection,
    );
    if (!query.legal) return null;
    const targets = query.recipientIds.map(
      (id) => this.battleManager.getEntityById(id)!,
    );
    const activationId = grid.activation.id;
    let events: SpellCastEvent[];
    this.spatialSelection = structuredClone(selection);
    try {
      events = this.executeCast(caster, targets);
    } finally {
      this.spatialSelection = undefined;
    }
    return events.map((event) => ({
      ...event,
      data: {
        ...event.data,
        spatial: {
          casterId: caster.id,
          activationId,
          selection: structuredClone(selection),
          tiles: query.tiles,
          recipientIds: query.recipientIds,
          actualRecipientIds: [
            ...new Set([
              ...(event.data.damageApplied?.keys() ?? []),
              ...(event.data.healingApplied?.keys() ?? []),
              ...(event.data.effectsApplied?.keys() ?? []),
            ]),
          ],
        },
      },
    }));
  }

  /** Re-query the committed aim after each strike, including deaths and team changes. */
  protected currentSpatialCandidates(caster: Entity): Entity[] {
    const grid = this.battleManager.grid;
    if (!grid || !this.config.targeting || !this.spatialSelection) return [];
    const { recipientIds } = queryCast(
      grid,
      this.battleManager.entities,
      caster.id,
      this.config.targeting,
      this.spatialSelection,
    );
    return recipientIds.map((id) => this.battleManager.getEntityById(id)!);
  }

  private executeCast(caster: Entity, targets: Entity[]): SpellCastEvent[] {
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
      ...(this.config.targeting ? { targeting: this.config.targeting } : {}),
    };
  }

  estimateDamage(_caster: Entity, _target: Entity): number | null {
    return null;
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
