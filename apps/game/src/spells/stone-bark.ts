import { nanoid } from "nanoid";
import { StatModifierEffect } from "../effect/stat-modifier.effect";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../types";
import { ApplyStatusSpell } from "./base/status.spell";

export class StoneBarkSpell extends ApplyStatusSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "stone-bark",
        name: "Stone Bark",
        manaCost: 10,
        cooldown: 3,
        targetType: { allies: 0, enemies: 0 },
      },
      new EffectModule(
        () =>
          new StatModifierEffect(
            "BUFF",
            [
              {
                id: nanoid(),
                attribute: "armor",
                value: 1.25,
                operation: "MULTIPLY",
              },
            ],
            2
          )
      )
    );
  }

  protected textDescription(caster: Entity): string {
    return `A stone bark spell that gives a single ally a 25% increased armor for 2 turns.`;
  }
}
