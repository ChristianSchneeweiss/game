import type { ActionSelectionHook, Entity, Spell } from "../types";

export class LowHpActionSelectionHook implements ActionSelectionHook {
  static name = "LowHpActionSelectionHook";

  name = LowHpActionSelectionHook.name;

  constructor(
    public spell: Spell,
    public hpPercentage: number,
    public priority: number
  ) {}

  condition(self: Entity): boolean {
    return self.health / self.maxHealth < this.hpPercentage;
  }

  actionSelection(self: Entity): ReturnType<Entity["getAction"]> | null {
    return { spell: this.spell, targets: [] };
  }

  serialize(): { name: string; priority: number; data: unknown } {
    return {
      name: this.name,
      priority: this.priority,
      data: {
        spellId: this.spell.config.id,
        hpPercentage: this.hpPercentage,
      },
    };
  }
}
