import type { EffectType, Entity, Spell, StatModifier } from "../types";
import { BaseEffect } from "./base-effect";

export class StatModifierEffect extends BaseEffect {
  private modifiers: StatModifier[];

  constructor(
    spellSource: Spell,
    effectType: EffectType,
    duration: number,
    source: Entity,
    modifiers: StatModifier[],
    target: Entity
  ) {
    super(spellSource, effectType, duration, source, target);
    this.modifiers = modifiers;
  }

  onApply(): void {
    this.modifiers.forEach((mod) => {
      this.target.statModifiers.push(mod);
    });
  }

  onRemove(): void {
    this.modifiers.forEach((mod) => {
      const index = this.target.statModifiers.indexOf(mod);
      if (index !== -1) {
        this.target.statModifiers.splice(index, 1);
      }
    });
  }
}
