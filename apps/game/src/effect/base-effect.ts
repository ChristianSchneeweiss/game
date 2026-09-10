import { nanoid } from "nanoid";
import type { BattleManager } from "../battle-types";
import type { Entity } from "../entity-types";
import type {
  DamageHookArgs,
  EffectHookArgs,
  HealingHookArgs,
} from "../lifecycle-hooks";
import type { Effect, EffectClock, EffectOrigin, EffectType } from "../types";

export abstract class BaseEffect implements Effect {
  id = nanoid(20);
  effectType: EffectType;
  duration: number;
  sourceId: string;
  targetId: string;
  origin: EffectOrigin = undefined!;
  battleManager: BattleManager;
  preventsAction = false;

  constructor(
    effectType: EffectType,
    duration: number,
    public clock: EffectClock = "turn",
  ) {
    this.effectType = effectType;
    this.duration = duration;

    // we set these to undefined! to avoid type errors
    // as they are set in the handler when we apply the effect
    this.sourceId = undefined!;
    this.targetId = undefined!;
    this.battleManager = undefined!;
  }

  onPreRound(): void {}

  onPostRound(): void {
    if (this.clock === "round") this.consumeDuration();
  }

  onEndStep() {
    if (this.clock === "turn") this.consumeDuration();
    return null;
  }

  private consumeDuration() {
    if (!this.getTarget().activeEffects.includes(this)) return;
    this.duration--;

    if (this.duration <= 0) {
      this.removeEffect();
    }
  }

  onApply(): void {}

  onRemove(): void {}

  beforeTakingDamage(args: DamageHookArgs): number {
    return args.damage;
  }

  beforeTakingHealing(args: HealingHookArgs): number {
    return args.healing;
  }

  beforeTakingEffect(args: EffectHookArgs): Effect | null {
    return args.effect;
  }

  beforeDealingDamage(args: DamageHookArgs): number {
    return args.damage;
  }

  beforeDealingHealing(args: HealingHookArgs): number {
    return args.healing;
  }

  beforeDealingEffect(args: EffectHookArgs): Effect | null {
    return args.effect;
  }

  /**
   * Removes the effect from the target, calls the onRemove hook and pushes the effect removal event
   */
  removeEffect(): void {
    if (!this.battleManager) throw new Error("Battle manager not found");

    const target = this.getTarget();
    if (!target.activeEffects.includes(this)) return;
    const hookIndex = this.battleManager.lifeCycleHooks.indexOf(this);
    if (hookIndex !== -1)
      this.battleManager.lifeCycleHooks.splice(hookIndex, 1);
    target.removeEffect(this);
    this.battleManager.processEvent({
      eventType: "EFFECT_REMOVAL",
      data: {
        effectId: this.id,
      },
    });
  }

  getDescription(): string {
    return "-";
  }

  protected getSource(): Entity {
    const source = this.battleManager.getEntityById(this.sourceId);
    if (!source) throw new Error(`Source not found ${this.sourceId}`);
    return source;
  }

  protected getTarget(): Entity {
    const target = this.battleManager.getEntityById(this.targetId);
    if (!target) throw new Error(`Target not found ${this.targetId}`);
    return target;
  }
}
