import { describe, expect, test } from "bun:test";
import { BM } from "../../../apps/game/src/bm";
import { EnemyTypeSchema } from "../../../apps/game/src/enemies/base/enemy-types";
import { createEnemyFromType } from "../../../apps/server/src/game-usecases/enemy-factory";
import { fixture } from "../support/spell-fixture";

describe("registered enemy targeting", () => {
  for (const option of EnemyTypeSchema.options) {
    const type = option.value;
    test(`${type}: each spell selects legal living targets and empty mana falls back`, () => {
      for (const depleted of [false, true]) {
        for (let spellIndex = 0; ; spellIndex++) {
          const enemy = createEnemyFromType(type, `ai-${type}`);
          if (spellIndex >= enemy.spells.length) break;
          // Reaction execution is covered by the encounter sweep. Check AI spell
          // priority and target choice using the real registered loadout.
          enemy.passiveSkills = [];
          enemy.baseAttributes.agility = 200;
          enemy.mana = depleted ? 0 : enemy.maxMana;
          enemy.spells.slice(0, spellIndex).forEach((spell) => { spell.currentCooldown = 1; });
          const context = fixture("basic-attack", `ai-${type}-${spellIndex}-${depleted}`);
          const opponent = context.caster;
          const deadAlly = context.enemies[0]!;
          deadAlly.health = 0;
          const bm = new BM([enemy, deadAlly, ...context.allies, opponent], `ai-${type}-${spellIndex}-${depleted}`);
          bm.start();
          const action = enemy.getAction();
          expect(action.spell.canCast(enemy)).toBe(true);
          expect(new Set(action.targets).size).toBe(action.targets.length);
          const targetType = action.spell.getTargetType();
          const valid = action.spell.getValidTargets(enemy);
          expect(action.targets.every((target) => valid.includes(target) && !target.isDead())).toBe(true);
          expect(action.targets.filter((target) => target.team !== enemy.team).length)
            .toBe(Math.min(targetType.enemies, valid.filter((target) => target.team !== enemy.team).length));
          expect(action.targets.filter((target) => target.team === enemy.team).length)
            .toBe(Math.min(targetType.allies, valid.filter((target) => target.team === enemy.team).length));
          if (depleted) expect(action.spell.config.manaCost).toBe(0);
        }
      }
    });
  }
});
