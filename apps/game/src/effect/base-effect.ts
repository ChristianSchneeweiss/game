import { nanoid } from "nanoid";
import type { BattleManager } from "../battle-types";
import type { Entity } from "../entity-types";
import type {
  DamageHookArgs,
  EffectHookArgs,
  HealingHookArgs,
} from "../lifecycle-hooks";
import type { Effect, EffectType, Spell } from "../types";

export abstract class BaseEffect implements Effect {
  id = nanoid(20);
  effectType: EffectType;
  duration: number;
  sourceId: string;
  targetId: string;
  spellSourceId: string;
  battleManager: BattleManager;

  constructor(effectType: EffectType, duration: number) {
    this.effectType = effectType;
    this.duration = duration;

    // we set these to undefined! to avoid type errors
    // as they are set in the handler when we apply the effect
    this.sourceId = undefined!;
    this.targetId = undefined!;
    this.spellSourceId = undefined!;
    this.battleManager = undefined!;
  }

  onPreRound(): void {}

  onPostRound(): void {}

  onEndStep() {
    this.duration--;

    if (this.duration <= 0) {
      this.removeEffect();
    }

    return null;
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
    target.removeEffect(this);
    // remove from battle manager life cycle hooks
    this.battleManager.lifeCycleHooks.splice(
      this.battleManager.lifeCycleHooks.indexOf(this),
      1
    );
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

  protected getSpellSource(): Spell {
    const spellSource = this.battleManager.getSpellById(this.spellSourceId);
    if (!spellSource)
      throw new Error(`Spell source not found ${this.spellSourceId}`);
    return spellSource;
  }
}
