import type { Team } from "../entity-types";
import { BaseEffect } from "./base-effect";

export class MindControlEffect extends BaseEffect {
  private originalTeam: Team;

  constructor(duration: number, originalTeam: Team) {
    super("CONTROL", duration);
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
