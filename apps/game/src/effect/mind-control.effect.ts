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
    const target = this.getTarget();
    const source = this.getSource();
    target.team = source.team;
  }

  onRemove(): void {
    const target = this.getTarget();
    target.team = this.originalTeam;
  }
}
