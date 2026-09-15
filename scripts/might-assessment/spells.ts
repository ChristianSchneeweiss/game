import { BaseEntity } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import {
  MIGHT_REFERENCE,
  type MightReferenceBuild,
} from "../../apps/game/src/might/reference-profile";
import { SpellTypeSchema } from "../../apps/game/src/spells/base/spell-types";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import { referenceHero } from "./reference";

const rows = (
  Object.keys(MIGHT_REFERENCE.profiles) as MightReferenceBuild[]
).flatMap((build) => {
  const caster = referenceHero(build);
  const target = new BaseEntity(
    "target",
    "Reference target",
    "TEAM_B",
    1000,
    500,
    { strength: 80, intelligence: 80, vitality: 100, agility: 20, movement: 3 },
  );
  // Descriptive estimates only; effects, healing, expiry and charge need separate judgment.
  caster.spells = SpellTypeSchema.options.map(({ value }) =>
    createSpellFromType(`preview:${value}`, value),
  );
  const partner = new BaseEntity(
    "partner",
    "Reference partner",
    "TEAM_B",
    1000,
    500,
    { strength: 80, intelligence: 80, vitality: 100, agility: 19, movement: 3 },
  );
  new BM([caster, target, partner], "might-spells-v3", {
    rulesVersion: 2,
    battlefield: {
      width: 5,
      height: 5,
      blocked: [],
      layoutVersion: "might-spells-v3",
    },
    positions: {
      hero: { x: 2, y: 2 },
      target: { x: 3, y: 2 },
      partner: { x: 3, y: 1 },
    },
  });
  return caster.spells.map((spell) => {
    const undefended = spell.estimateDamage?.(caster, target) ?? null;
    target.baseSpecialAttributes.armor = 30;
    target.baseSpecialAttributes.magicResistance = 20;
    const defended = spell.estimateDamage?.(caster, target) ?? null;
    target.baseSpecialAttributes.armor = 0;
    target.baseSpecialAttributes.magicResistance = 0;
    return {
      build,
      type: spell.config.type,
      description: spell.description(caster).text,
      undefended,
      defended,
      mana: spell.config.manaCost,
      cooldown: spell.config.cooldown,
    };
  });
});
await Bun.write(
  "docs/might/assessments/spell-previews-v3.json",
  JSON.stringify({
    version: 3,
    bun: Bun.version,
    reference: MIGHT_REFERENCE,
    rows,
  }),
);
for (const row of rows) console.log(JSON.stringify(row));
