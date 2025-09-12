import type { Entity, Spell, Team } from "../types";
import { BaseEffect } from "./base-effect";

export class MindControlEffect extends BaseEffect {
  private originalTeam: Team;

  constructor(
    spellSource: Spell,
    duration: number,
    source: Entity,
    target: Entity,
    originalTeam: Team
  ) {
    super(spellSource, "CONTROL", duration, source, target);
    this.originalTeam = originalTeam;
  }

  onApply(): void {
    this.target.team = this.source.team;
  }

  onRemove(): void {
    this.target.team = this.originalTeam;
  }
}
