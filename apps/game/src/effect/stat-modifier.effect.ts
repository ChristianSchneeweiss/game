import type { EffectType, Entity, Spell, AttributeModifier } from "../types";
import { BaseEffect } from "./base-effect";

export class StatModifierEffect extends BaseEffect {
  private modifiers: AttributeModifier[];

  constructor(
    spellSource: Spell,
    effectType: EffectType,
    duration: number,
    source: Entity,
    modifiers: AttributeModifier[],
    target: Entity
  ) {
    super(spellSource, effectType, duration, source, target);
    this.modifiers = modifiers;
  }

  onApply(): void {
    this.modifiers.forEach((mod) => {
      this.target.attributeModifiers.push(mod);
    });
  }

  onRemove(): void {
    this.modifiers.forEach((mod) => {
      const index = this.target.attributeModifiers.indexOf(mod);
      if (index !== -1) {
        this.target.attributeModifiers.splice(index, 1);
      }
    });
  }
}
