import { expect, test } from "bun:test";
import { PassiveTypeSchema, type PassiveType } from "../../../apps/game/src/passive-skills/base/passive-types";
import { cast, checkResources, fixture, registered } from "../support/spell-fixture";

const passives: (PassiveType | undefined)[] = [undefined, ...PassiveTypeSchema.options.map((option) => option.value)];
for (const passive of passives) {
  test(`${passive ?? "no passive"}: every registered spell completes through server commands`, () => {
    const failures: string[] = [];
    for (const type of registered) {
      try {
        const f = fixture(type, "effects-audit-deterministic", 1, 1, passive ? [passive] : []);
        cast(f);
        checkResources(f.bm.entities);
        expect(f.caster.mana).toBe(1000 - f.spell.config.manaCost);
      } catch (error) {
        failures.push(`${type}: ${String(error)}`);
      }
    }
    expect(failures).toEqual([]);
  });
}
