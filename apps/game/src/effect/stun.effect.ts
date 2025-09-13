import type { Entity, Spell } from "../types";
import { BaseEffect } from "./base-effect";

export class StunEffect extends BaseEffect {
  constructor(
    spellSource: Spell,
    duration: number,
    source: Entity,
    target: Entity
  ) {
    super(spellSource, "STUN", duration, source, target);
  }

  getDescription(): string {
    return "Can not act this turn";
  }
}
