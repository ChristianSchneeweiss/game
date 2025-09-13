import { nanoid } from "nanoid";
import type {
  BattleManager,
  Effect,
  EffectType,
  Entity,
  Spell,
} from "../types";

export abstract class BaseEffect implements Effect {
  id = nanoid(20);
  effectType: EffectType;
  duration: number;
  sourceId: string;
  targetId: string;
  spellSourceId: string;
  battleManager?: BattleManager;

  constructor(effectType: EffectType, duration: number) {
    this.effectType = effectType;
    this.duration = duration;

    // we set these to undefined! to avoid type errors
    // as they are set in the handler when we apply the effect
    this.sourceId = undefined!;
    this.targetId = undefined!;
    this.spellSourceId = undefined!;
  }

  onPreRound(): void {}

  onPostRound(): void {
    this.duration--;

    if (this.duration < 0) {
      this.removeEffect();
    }
  }

  onApply(): void {}

  onRemove(): void {}

  beforeTakingDamage(damage: number): number {
    return damage;
  }

  beforeTakingHealing(healing: number): number {
    return healing;
  }

  beforeTakingEffect(effect: Effect): Effect | null {
    return effect;
  }

  beforeDealingDamage(damage: number): number {
    return damage;
  }

  beforeDealingHealing(healing: number): number {
    return healing;
  }

  beforeDealingEffect(effect: Effect): Effect | null {
    return effect;
  }

  removeEffect(): void {
    const target = this.getTarget();
    target.removeEffect(this);
    this.battleManager?.processEvent({
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
    const source = this.battleManager?.getEntityById(this.sourceId);
    if (!source) throw new Error(`Source not found ${this.sourceId}`);
    return source;
  }

  protected getTarget(): Entity {
    const target = this.battleManager?.getEntityById(this.targetId);
    if (!target) throw new Error(`Target not found ${this.targetId}`);
    return target;
  }

  protected getSpellSource(): Spell {
    const spellSource = this.battleManager?.getSpellById(this.spellSourceId);
    if (!spellSource)
      throw new Error(`Spell source not found ${this.spellSourceId}`);
    return spellSource;
  }
}
