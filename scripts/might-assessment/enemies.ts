import { BM } from "../../apps/game/src/bm";
import {
  EnemyTypeSchema,
  type EnemyType,
} from "../../apps/game/src/enemies/base/enemy-types";
import { createEnemyFromType } from "../../apps/game/src/enemies/enemy-factory";
import { MIGHT_REFERENCE } from "../../apps/game/src/might/reference-profile";
import {
  mean,
  playReferenceBattle,
  quiet,
  referenceHero,
  referenceImpacts,
} from "./reference";

/** Current enemy kits against the late-mid-game party, individually and in groups. */
export function measureEnemy(
  type: EnemyType,
  spread: boolean,
  count: number,
  seed: string,
) {
  const heroes = [
    referenceHero("physical", "hero-0"),
    referenceHero("caster", "hero-1"),
  ];
  // Preserve the 160-point budget while making physical/caster initiative stable.
  heroes[1]!.baseAttributes.agility--;
  heroes[1]!.baseAttributes.strength++;
  const enemies = Array.from({ length: count }, (_, index) =>
    createEnemyFromType(type, `enemy-${index}`),
  );
  const bm = new BM([...heroes, ...enemies], seed, {
    rulesVersion: 2,
    battlefield: {
      width: 7,
      height: 7,
      blocked: [],
      layoutVersion: "might-enemies-v3",
    },
    positions: {
      "hero-0": { x: 2, y: 3 },
      "hero-1": { x: 2, y: spread ? 5 : 2 },
      ...Object.fromEntries(
        enemies.map((enemy, index) => [
          enemy.id,
          { x: 4 + (spread && index === 2 ? 1 : 0), y: 2 + index },
        ]),
      ),
    },
  });
  bm.start();
  playReferenceBattle(bm, 18);
  const impacts = referenceImpacts(bm);
  return {
    rounds: bm.getCurrentRoundNumber(),
    enemyWon: Number(bm.getWinningTeam() === "TEAM_B"),
    unfinished: Number(!bm.isGameOver()),
    heroDeaths: heroes.filter((hero) => hero.isDead()).length,
    damageToParty: impacts
      .filter((impact) => impact.targetId.startsWith("hero-"))
      .reduce((sum, impact) => sum + Math.max(0, -impact.healthChange), 0),
    damageToEnemies: impacts
      .filter((impact) => impact.targetId.startsWith("enemy-"))
      .reduce((sum, impact) => sum + Math.max(0, -impact.healthChange), 0),
    enemyHealing: impacts
      .filter((impact) => impact.targetId.startsWith("enemy-"))
      .reduce((sum, impact) => sum + Math.max(0, impact.healthChange), 0),
  };
}

if (import.meta.main) {
  const seeds = Array.from(
    { length: 16 },
    (_, index) => `might-enemies-v2-${index}`,
  );
  const rows = quiet(() =>
    EnemyTypeSchema.options.flatMap(({ value: type }) =>
      [1, 3].map((count) => {
        const runs = [false, true].flatMap((spread) =>
          seeds.map((seed) => ({
            seed,
            spread,
            ...measureEnemy(type, spread, count, seed),
          })),
        );
        return {
          type,
          count,
          means: {
            rounds: mean(runs.map((run) => run.rounds)),
            damageToParty: mean(runs.map((run) => run.damageToParty)),
            damageToEnemies: mean(runs.map((run) => run.damageToEnemies)),
            enemyHealing: mean(runs.map((run) => run.enemyHealing)),
          },
          heroDeaths: runs.reduce((sum, run) => sum + run.heroDeaths, 0),
          enemyWins: runs.reduce((sum, run) => sum + run.enemyWon, 0),
          unfinished: runs.reduce((sum, run) => sum + run.unfinished, 0),
          runs,
        };
      }),
    ),
  );
  await Bun.write(
    "docs/might/assessments/enemy-probes-v3.json",
    JSON.stringify({
      version: 3,
      bun: Bun.version,
      reference: MIGHT_REFERENCE,
      partyAttributeOverrides: { caster: { strength: 21, agility: 24 } },
      seedFamily:
        "v2 seed strings intentionally retained for baseline/input comparisons",
      seeds,
      conditions:
        "Level-31-budget physical/caster party with four spells each plus Basic Attack and real E–B catalogue gear; zero synthetic stat allowances. Actual unscaled enemy kits, singly and in groups of three. Clustered/spread 7x7 starts, real movement and shared heuristic AI, max 18 rounds. Values are encounter evidence, not player win-rate predictions or automatic scores.",
      rows,
    }),
  );
  for (const { runs, ...row } of rows) console.log(JSON.stringify(row));
}
