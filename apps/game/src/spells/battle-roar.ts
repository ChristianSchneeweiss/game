import { StunEffect } from "../effect/stun.effect";
import { EffectModule } from "../modules/effect.module";
import type { Entity } from "../entity-types";
import { ApplyStatusSpell } from "./base/status.spell";

export class BattleRoarSpell extends ApplyStatusSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "battle-roar",
        name: "Battle Roar",
        manaCost: 15,
        cooldown: 3,
        targetType: { allies: 0, enemies: 1 },
      },
      new EffectModule(() => new StunEffect(1)),
      0.6
    );
  }

  protected textDescription(caster: Entity): string {
    return `A magical roar that has a 60% chance to stun a single enemy for 1 turn.`;
  }
}
