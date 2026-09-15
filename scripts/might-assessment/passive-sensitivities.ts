import {
  MIGHT_REFERENCE,
  type MightReferenceBuild,
} from "../../apps/game/src/might/reference-profile";
import {
  PassiveTypeSchema,
  type PassiveType,
} from "../../apps/game/src/passive-skills/base/passive-types";
import {
  measurePressure,
  summarizePairs,
  type PressureCase,
} from "./slot-probes";
import { measureSequence, type SequenceCase } from "./sequence-probes";
import { mean, quiet } from "./reference";

const builds: Record<PassiveType, MightReferenceBuild[]> = {
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
  "fleet-footed": ["physical"],
  "arcane-barrier": ["tank", "caster"],
  "last-bastion": ["physical", "tank"],
  "merciful-light": ["caster"],
  executioner: ["physical", "caster"],
};
const seeds = Array.from(
  { length: 16 },
  (_, i) => `might-passive-sensitivity-v3-${i}`,
);
const rows = quiet(() =>
  PassiveTypeSchema.options.map(({ value: type }) => {
    const runs = builds[type].flatMap((build) =>
      [6, 12].flatMap((rounds) =>
        [false, true].flatMap((depleted) =>
          [false, true].flatMap((armored) =>
            seeds.map((seed) => {
              const input: PressureCase = {
                build,
                rounds,
                depleted,
                armored,
                seed,
                approach: type === "fleet-footed",
                rawPressure: 45,
                ...(type === "executioner" ? { enemyFraction: 0.3 } : {}),
                ...(type === "last-bastion" || type === "titans-resurgence"
                  ? { heroFraction: 0.25 }
                  : {}),
                ...(type === "fleet-footed" ? { basicOnly: true } : {}),
              };
              return {
                input,
                baseline: measurePressure(input),
                treatment: measurePressure({ ...input, passive: type }),
              };
            }),
          ),
        ),
      ),
    );
    return { type, summary: summarizePairs(runs), runs };
  }),
);
const healing = quiet(() =>
  [0.25, 0.75].flatMap((healthFraction) =>
    seeds.map((seed) => {
      const input: SequenceCase = {
        type: "natures-embrace",
        build: "caster",
        count: 1,
        armored: false,
        pressure: 0,
        healthFraction,
        seed,
        rounds: 1,
      };
      return {
        input,
        baseline: measureSequence(input),
        treatment: measureSequence({ ...input, passive: "merciful-light" }),
      };
    }),
  ),
);
const mobility = quiet(() =>
  (
    [
      "gale-striders",
      "bastion-greaves",
      "tempest-sabatons",
      "horizon-walkers",
      "stormrunner-leathers",
      "gravewarden-plate",
      "citadel-carapace",
    ] as const
  ).map((item) => {
    const runs = seeds.flatMap((seed) =>
      [false, true].flatMap((armored) =>
        [3, 4, 5].map((approachDistance) => {
          const input: PressureCase = {
            build: "physical",
            rounds: 6,
            depleted: false,
            armored,
            seed,
            approach: true,
            approachDistance,
            rawPressure: 45,
            basicOnly: true,
            item,
          };
          return {
            input,
            baseline: measurePressure({ ...input, removeMovementBonus: true }),
            treatment: measurePressure(input),
          };
        }),
      ),
    );
    return { type: item, summary: summarizePairs(runs), runs };
  }),
);
await Bun.write(
  "docs/might/assessments/passive-sensitivities-v3.json",
  JSON.stringify({
    version: 3,
    bun: Bun.version,
    reference: MIGHT_REFERENCE,
    seeds,
    conditions:
      "Supplemental lower pressure: 45 raw mixed threats, 6/12 rounds, fresh/depleted, both defenses. Executioner starts targets at 30% HP; Last Bastion and Titan start hero at 25%; Fleet Footed uses five-tile approach with Basic Attack only. These altered activation cases are separate from canonical 65-raw pressure. Merciful Light healing cases use actual Nature’s Embrace at 25/75% starting health, zero pressure and one round. Equipment mobility pairs remove only movement modifiers, preserving every other stat.",
    rows,
    healing,
    mobility,
  }),
);
for (const { runs, ...row } of rows) console.log(JSON.stringify(row));
console.log(
  JSON.stringify({
    healing: mean(
      healing
        .filter((x) => x.input.healthFraction === 0.25)
        .map((x) => x.treatment.healing - x.baseline.healing),
    ),
  }),
);
for (const { runs, ...row } of mobility) console.log(JSON.stringify(row));
