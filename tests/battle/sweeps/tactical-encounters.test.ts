import { expect, test } from "bun:test";
import SuperJSON from "superjson";
import { Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { DungeonKeySchema } from "../../../apps/game/src/dungeons/dungeon-keys";
import { itemFactory } from "../../../apps/game/src/items/equipment/item-factory";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../../apps/game/src/spells/base/spell-types";
import { planEnemyTurn } from "../../../apps/game/src/tactical/ai";
import { createEncounterGrid } from "../../../apps/game/src/tactical/encounters";
import { tileKey } from "../../../apps/game/src/tactical/queries";
import {
  applyGridCommand,
  advanceBots,
} from "../../../apps/server/src/battle/commands";
import type { GridCommand } from "../../../apps/server/src/battle/protocol";
import { reconstructBattle } from "../../../apps/server/src/battle/reconstruct-battle";
import {
  captureStartingBuilds,
  restoreStartingBuilds,
} from "../../../apps/server/src/battle/starting-builds";
import {
  deserializeStartingBuilds,
  deserializeStartingGrid,
  serializeStartingBuilds,
} from "../../../apps/server/src/battle/starting-build-codec";
import { dungeonManager } from "../../../apps/server/src/game-usecases/dungeon-manager";
import { createEnemyFromType } from "../../../apps/server/src/game-usecases/enemy-factory";
import { buildTimeline } from "../../../apps/client/src/routes/battle/-presentation/timeline";
import {
  combatState,
  expectClientMatchesServer,
  expectCoherentCombat,
} from "../support/invariants";

const kits: SpellType[][] = [
  [
    "tidepiercer-thrust",
    "precise-thrust",
    "crude-strike",
    "iron-will",
    "basic-attack",
  ],
  ["fireball", "charred-chains", "single-heal", "basic-attack"],
];
for (const { value: key } of DungeonKeySchema.options) {
  const config = dungeonManager.getDungeonConfig(key);
  test(`${key}: every encounter has an authored, valid solo and cooperative layout`, () => {
    expect(config.battlefields).toHaveLength(config.availableEnemies.length);
  });
  for (const [wave, types] of config.availableEnemies.entries()) {
    for (const scenario of [
      "solo-melee",
      "solo-ranged",
      "cooperative",
    ] as const) {
      const seed = `tactical-${key}-${wave}-${scenario}`;
      test(`${seed}: completes with legal moves, command recovery and replay parity`, () => {
        const partySize = scenario === "cooperative" ? 2 : 1;
        const heroes = Array.from({ length: partySize }, (_, index) => {
          const kit = scenario === "solo-ranged" ? 1 : index;
          const hero = new Character(
            `hero-${index}`,
            `owner-${index}`,
            `Hero ${index}`,
            "TEAM_A",
            900,
            300,
            {
              strength: 45,
              intelligence: 45,
              vitality: 30,
              agility: 40 - index,
            },
            0,
            8,
            0,
          );
          hero.spells = kits[kit]!.map((type) =>
            createSpellFromType(`${hero.id}-${type}`, type),
          );
          const type = kit === 0 ? "iron-sword" : "oakwarden-staff";
          hero.equipped.WEAPON = itemFactory(type, `${hero.id}-weapon`, hero);
          return hero;
        });
        const enemies = types.map((type, index) =>
          createEnemyFromType(type, `enemy-${index}`),
        );
        const entities = [...heroes, ...enemies];
        const setup = createEncounterGrid(
          config.battlefields![wave]!,
          entities,
        );
        const saved = serializeStartingBuilds(
          captureStartingBuilds(entities, true),
          setup,
        );
        const builds = deserializeStartingBuilds(saved);
        const frozenGrid = deserializeStartingGrid(saved)!;
        const bm = new BM(restoreStartingBuilds(builds), seed, frozenGrid);
        let replay = new BM(restoreStartingBuilds(builds), seed, frozenGrid);
        bm.start();
        advanceBots(bm);
        replay.start();
        advanceBots(replay);
        const commands: string[] = [];
        const check = () => {
          expectCoherentCombat(bm);
          expectClientMatchesServer(bm);
          expect(combatState(replay)).toEqual(combatState(bm));
          expect(replay.grid).toEqual(bm.grid);
          expect(replay.revision).toBe(bm.revision);
          const occupied = bm
            .getAliveEntities()
            .map((entity) => tileKey(bm.grid!.positions[entity.id]!));
          expect(new Set(occupied).size).toBe(occupied.length);
          expect(
            buildTimeline(
              bm.startEntityData,
              bm.events,
              undefined,
              bm.effectTracking,
            ).at(-1)!.grid,
          ).toEqual(bm.grid);
        };
        const commit = (command: GridCommand) => {
          commands.push(SuperJSON.stringify(command));
          const actor = bm.getEntityById(command.data.entityId) as Character;
          const revision = bm.revision;
          applyGridCommand(bm, command, actor.userId);
          expect(bm.revision).toBeGreaterThan(revision);
          // Every accepted command resumes from serialized data for the opening wave;
          // all other encounters run an independent restored engine command-for-command.
          if (wave === 0)
            replay = reconstructBattle(seed, builds, commands, frozenGrid);
          else applyGridCommand(replay, command, actor.userId);
          check();
        };
        try {
          check();
          while (!bm.isGameOver() && commands.length < 250) {
            const actor = bm.getEntityById(
              bm.grid!.activation!.entityId,
            ) as Character;
            const rng = structuredClone(bm.rng.state!());
            const plan = planEnemyTurn(bm);
            expect(bm.rng.state!()).toEqual(rng);
            const identity = () => ({
              entityId: actor.id,
              activationId: bm.grid!.activation!.id,
              revision: bm.revision,
              requestId: `${seed}:${commands.length}`,
            });
            if (plan.destination)
              commit({
                type: "move",
                data: { ...identity(), destination: plan.destination },
              });
            if (plan.spellId && plan.selection)
              commit({
                type: "castSpatial",
                data: {
                  ...identity(),
                  spellId: plan.spellId,
                  selection: plan.selection,
                },
              });
            else commit({ type: "endTurn", data: identity() });
          }
          expect(
            bm.isGameOver(),
            "the battle finishes within 250 player commands",
          ).toBe(true);
        } catch (error) {
          throw new Error(
            `seed=${seed}; command prefix=${commands.join("\n")}\n${String(error)}`,
            { cause: error },
          );
        }
      }, 60_000);
    }
  }
}
