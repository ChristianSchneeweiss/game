import { describe, expect, test } from "bun:test";
import { castBattleSpell, describeBattleSpell } from "../../../apps/server/src/battle/commands";
import { owner, registered, fixture, command, compactState, checkResources } from "../support/spell-fixture";

describe("all registered spells through real server target/cast commands", () => {
  for (const type of registered) {
    test(`${type}: legal sets, readonly descriptions, resource bounds across 64 scenarios`, () => {
      const rejections: string[] = [];
      for (let seed = 0; seed < 16; seed++) {
        for (const scenario of ["full", "wounded", "single", "dead"] as const) {
          const f = fixture(type, `spell-audit-${seed}`, scenario === "single" ? 1 : 4);
          if (scenario === "wounded") {
            f.caster.health = 200;
            f.allies.forEach((ally) => { ally.health = 250; });
            f.enemies.forEach((enemy) => { enemy.health = 100; });
          }
          if (scenario === "dead") {
            f.allies[1]!.health = 0;
            f.enemies[3]!.health = 0;
          }
          const beforeRead = compactState(f);
          expect(describeBattleSpell(f.bm, f.caster, f.spell).text).toBeString();
          const data = command(f);
          expect(compactState(f)).toBe(beforeRead);
          let rejection: string | undefined;
          try { castBattleSpell(f.bm, data, owner); }
          catch (error) { rejection = String(error); }
          if (rejection) {
            rejections.push(`${scenario} seed ${seed}: ${rejection}`);
          }
          checkResources([f.caster, ...f.allies, ...f.enemies]);
          expect(f.caster.mana).toBe(1000 - f.spell.config.manaCost);
          if (!rejection) {
            expect(f.bm.events.some(({ event }) => event.eventType === "SPELL_CAST"
              && event.data.spellId === f.spell.config.id)).toBe(true);
          }
        }
      }
      expect(rejections, `${type}: legal casts must not reject after spending resources`).toEqual([]);
    });
  }
});
