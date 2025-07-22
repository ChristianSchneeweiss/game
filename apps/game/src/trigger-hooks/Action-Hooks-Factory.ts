import z from "zod";
import type { ActionSelectionHook, Entity } from "../types";
import { LowHpActionSelectionHook } from "./Low-Hp-THook";

export class ActionHooksFactory {
  static createActionHooks(
    entities: Entity[],
    data: ReturnType<ActionSelectionHook["serialize"]>[]
  ): ActionSelectionHook[] {
    return data.map((hook) => {
      switch (hook.name) {
        case "LowHpActionSelectionHook":
          const schema = z.object({
            spellId: z.string(),
            hpPercentage: z.number(),
          });
          const data = schema.parse(hook.data);
          const spell = entities
            .flatMap((e) => e.spells)
            .find((s) => s.config.id === data.spellId);
          if (!spell) {
            throw new Error(`Spell not found: ${data.spellId}`);
          }
          return new LowHpActionSelectionHook(
            spell,
            data.hpPercentage,
            hook.priority
          );
        default:
          throw new Error(`Unknown hook: ${hook.name}`);
      }
    });
  }
}
