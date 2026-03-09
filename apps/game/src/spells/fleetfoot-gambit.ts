import { ExtraActionEffect } from "../effect/extra-action.effect";
import type { Entity } from "../entity-types";
import { EffectModule } from "../modules/effect.module";
import { ApplyStatusSpell } from "./base/status.spell";

export class FleetfootGambitSpell extends ApplyStatusSpell {
  constructor(id: string) {
    super(
      {
        id,
        type: "fleetfoot-gambit",
        name: "Fleetfoot Gambit",
        manaCost: 50,
        cooldown: 8,
        targetType: { allies: 1, enemies: 0 },
        tier: "S",
      },
      new EffectModule(() => {
        return new ExtraActionEffect(1);
      }),
    );
  }

  protected textDescription(caster: Entity): string {
    return `"Some see only one motion – but the blade has already fallen twice." Grants the player a second action in the next round.`;
  }
}
