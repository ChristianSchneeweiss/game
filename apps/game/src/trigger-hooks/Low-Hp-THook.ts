import type {
  ActionSelectionHook,
  BattleManager,
  Entity,
  Spell,
} from "../types";

export class LowHpActionSelectionHook implements ActionSelectionHook {
  static name = "LowHpActionSelectionHook";

  name = LowHpActionSelectionHook.name;

  constructor(
    public id: string,
    public spell: Spell,
    public hpPercentage: number,
    public priority: number
  ) {}

  condition(self: Entity, battleManager: BattleManager): boolean {
    if (!this.spell.canCast(self)) {
      return false;
    }

    const myTeam = battleManager.getTeam(self.team);
    const percentageHps = myTeam.map((e) => e.health / e.maxHealth);
    return percentageHps.some((p) => p < this.hpPercentage);
  }

  actionSelection(
    self: Entity,
    battleManager: BattleManager
  ): ReturnType<Entity["getAction"]> | null {
    return { spell: this.spell, targets: [] };
  }

  serialize(): unknown {
    return {
      spellId: this.spell.config.id,
      hpPercentage: this.hpPercentage,
    };
  }
}
