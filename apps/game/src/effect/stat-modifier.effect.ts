import type { AttributeModifier, EffectType, Entity, Spell } from "../types";
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
    const target = this.getTarget();
    this.modifiers.forEach((mod) => {
      target.attributeModifiers.push(mod);
    });
  }

  onRemove(): void {
    const target = this.getTarget();

    this.modifiers.forEach((mod) => {
      const index = target.attributeModifiers.indexOf(mod);
      if (index !== -1) {
        target.attributeModifiers.splice(index, 1);
      }
    });
  }

  getDescription(): string {
    const modifiers = this.modifiers
      .map((mod) => `${mod.attribute}: ${Math.round(mod.value * 100)}%`)
      .join("\n");

    return `Modifiers: ${modifiers}`;
  }
}
