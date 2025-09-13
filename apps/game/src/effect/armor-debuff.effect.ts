import { nanoid } from "nanoid";
import type { AttributeModifier, Entity, Spell } from "../types";
import { StatModifierEffect } from "./stat-modifier.effect";

export class ArmorDebuffEffect extends StatModifierEffect {
  constructor(
    spellSource: Spell,
    source: Entity,
    target: Entity,
    statModifier: Pick<AttributeModifier, "value" | "operation">,
    duration: number
  ) {
    super(
      spellSource,
      source,
      target,
      "DEBUFF",
      [
        {
          id: nanoid(),
          attribute: "armor",
          value: statModifier.value,
          operation: statModifier.operation,
        },
      ],
      duration
    );
  }
}
