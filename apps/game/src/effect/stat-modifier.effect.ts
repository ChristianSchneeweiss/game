import type { AttributeModifier, EffectType } from "../types";
import { BaseEffect } from "./base-effect";

export class StatModifierEffect extends BaseEffect {
  private modifiers: AttributeModifier[];

  constructor(
    effectType: EffectType,
    modifiers: AttributeModifier[],
    duration: number
  ) {
    super(effectType, duration);
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
      .map((mod) => {
        const text =
          mod.operation === "ADD"
            ? `${mod.value}.`
            : `${Math.round((mod.value - 1) * 100)}%.`;
        return `${mod.attribute}: ${text}`;
      })
      .join("\n");

    return `Modifiers: ${modifiers}`;
  }
}
