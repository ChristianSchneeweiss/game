import { nanoid } from "nanoid";
import type { AttributeModifier } from "../types";
import { StatModifierEffect } from "./stat-modifier.effect";

export class ArmorDebuffEffect extends StatModifierEffect {
  constructor(
    statModifier: Pick<AttributeModifier, "value" | "operation">,
    duration: number
  ) {
    super(
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
