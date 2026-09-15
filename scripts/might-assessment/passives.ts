import { BaseEntity } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import {
  MIGHT_REFERENCE,
  type MightReferenceBuild,
} from "../../apps/game/src/might/reference-profile";
import { TotalDamageModule } from "../../apps/game/src/modules/damage.module";
import type { PassiveType } from "../../apps/game/src/passive-skills/base/passive-types";
import { DamageSpell } from "../../apps/game/src/spells/base/damage.spell";
import {
  mean,
  playReferenceBattle,
  quiet,
  referenceHero,
  referenceImpacts,
} from "./reference";

const builds = {
  "armor-up": ["tank"],
  "thorn-carapace": ["tank"],
  "blessed-fortune": ["physical", "caster"],
  bloodfang: ["physical"],
  soulleech: ["caster"],
  "mystic-flow": ["caster"],
  "vital-wellspring": ["physical", "tank"],
  "stoneform-resolve": ["tank"],
  "titans-resurgence": ["physical", "tank"],
  "keen-instincts": ["physical", "caster"],
  "predators-focus": ["physical", "caster"],
  // Stationary pressure does not assess the tactical value of movement.
  "fleet-footed": ["physical"],
  "arcane-barrier": ["tank", "caster"],
  "last-bastion": ["physical", "tank"],
  "merciful-light": ["caster"],
  executioner: ["physical", "caster"],
} satisfies Record<PassiveType, MightReferenceBuild[]>;

export function measurePassive(
  build: MightReferenceBuild,
  rounds: number,
  depleted: boolean,
  armored: boolean,
  seed: string,
  passive?: PassiveType,
) {
  const hero = referenceHero(build, "hero", passive);
  // Stationary pressure isolates sustained effects; enemy probes separately exercise movement.
  hero.baseAttributes.movement = 0;
  const threats = (["PHYSICAL", "MAGICAL"] as const).map(
    (damageType, index) => {
      const threat = new BaseEntity(
        `threat-${index}`,
        "Reference pressure",
        "TEAM_B",
        1500,
        0,
        {
          strength: 80,
          intelligence: 80,
          vitality: 100,
          agility: 40 - index,
          movement: 0,
        },
      );
      threat.baseSpecialAttributes.armor = armored ? 30 : 0;
      threat.baseSpecialAttributes.magicResistance = armored ? 20 : 0;
      threat.spells = [
        new DamageSpell(
          {
            id: `${threat.id}:pressure`,
            type: "fireball",
            name: "Reference pressure",
            manaCost: 0,
            cooldown: 0,
            tier: "E",
            targetType: { enemies: 1, allies: 0 },
            targeting: {
              aim: "tile",
              recipients: "enemies",
              range: { min: 1, max: 3 },
              affectedTiles: [[0, 0]],
            },
          },
          new TotalDamageModule(damageType, () => 65),
        ),
      ];
      return threat;
    },
  );
  const bm = new BM([hero, ...threats], seed, {
    rulesVersion: 2,
    battlefield: {
      width: 5,
      height: 5,
      blocked: [],
      layoutVersion: "might-passives-v2",
    },
    positions: {
      hero: { x: 2, y: 2 },
      "threat-0": { x: 3, y: 2 },
      "threat-1": { x: 2, y: 1 },
    },
  });
  bm.start();
  if (depleted) {
    hero.health = Math.round(hero.maxHealth * 0.55);
    hero.mana = Math.round(hero.maxMana * 0.1);
  }
  playReferenceBattle(bm, rounds);
  const impacts = referenceImpacts(bm);
  return {
    health: hero.health,
    mana: hero.mana,
    dead: Number(hero.isDead()),
    damage: impacts
      .filter((impact) => impact.targetId.startsWith("threat-"))
      .reduce((sum, impact) => sum + Math.max(0, -impact.healthChange), 0),
    healing: impacts
      .filter((impact) => impact.targetId === "hero")
      .reduce((sum, impact) => sum + Math.max(0, impact.healthChange), 0),
    rounds: bm.getCurrentRoundNumber(),
  };
}

if (import.meta.main) {
  const seeds = Array.from(
    { length: 16 },
    (_, index) => `might-passives-v2-${index}`,
  );
  const rows = quiet(() =>
    Object.entries(builds).map(([type, profiles]) => {
      const runs = profiles.flatMap((build) =>
        MIGHT_REFERENCE.rounds.flatMap((rounds) =>
          [false, true].flatMap((depleted) =>
            [false, true].flatMap((armored) =>
              seeds.map((seed) => {
                const baseline = measurePassive(
                  build,
                  rounds,
                  depleted,
                  armored,
                  seed,
                );
                const treatment = measurePassive(
                  build,
                  rounds,
                  depleted,
                  armored,
                  seed,
                  type as PassiveType,
                );
                return {
                  build,
                  rounds,
                  depleted,
                  armored,
                  seed,
                  baseline,
                  treatment,
                };
              }),
            ),
          ),
        ),
      );
      return {
        type,
        pairs: runs.length,
        healthGain: mean(
          runs.map((run) => run.treatment.health - run.baseline.health),
        ),
        damageGain: mean(
          runs.map((run) => run.treatment.damage - run.baseline.damage),
        ),
        healingGain: mean(
          runs.map((run) => run.treatment.healing - run.baseline.healing),
        ),
        manaGain: mean(
          runs.map((run) => run.treatment.mana - run.baseline.mana),
        ),
        baselineDeaths: runs.filter((run) => run.baseline.dead).length,
        treatmentDeaths: runs.filter((run) => run.treatment.dead).length,
        runs,
      };
    }),
  );
  await Bun.write(
    "docs/might/assessments/passive-probes-v2.json",
    JSON.stringify({
      version: 2,
      bun: Bun.version,
      reference: MIGHT_REFERENCE,
      seeds,
      conditions:
        "Matched with/without-passive stationary pressure: two 1500-HP threats each strike for 65 raw physical/magical damage before the hero, 0 or 30 armor/20 MR, 6/12 rounds, full or 55%-HP/10%-mana starts. Hero uses actual four-spell kit plus Basic Attack, real upkeep and shared heuristic AI. Same initial seed, not identical RNG draws after paths diverge. Endpoint changes are evidence, not an automatic Might score.",
      rows,
    }),
  );
  for (const { runs, ...row } of rows) console.log(JSON.stringify(row));
}
