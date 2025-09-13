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

  constructor(
    spellSource: Spell,
    effectType: EffectType,
    duration: number,
    source: Entity,
    target: Entity
  ) {
    this.effectType = effectType;
    // we add 1 to the duration to account for the initial round.
    // as the duration already gets decremented by 1 in the onPostRound method.
    this.duration = duration + 1;
    this.sourceId = source.id;
    this.targetId = target.id;
    this.spellSourceId = spellSource.config.id;
  }

  onPreRound(): void {}

  onPostRound(): void {
    this.duration--;

    if (this.duration <= 0) {
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
