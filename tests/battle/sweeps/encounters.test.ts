import { expect, test } from "bun:test";
import seedrandom from "seedrandom";
import { Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { DungeonKeySchema } from "../../../apps/game/src/dungeons/dungeon-keys";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../../apps/game/src/spells/base/spell-types";
import { dungeonManager } from "../../../apps/server/src/game-usecases/dungeon-manager";
import { createEnemyFromType } from "../../../apps/server/src/game-usecases/enemy-factory";
import { advanceBots, castBattleSpell, getBattleTargets } from "../../../apps/server/src/battle/commands";
import { captureStartingBuilds, restoreStartingBuilds } from "../../../apps/server/src/battle/starting-builds";
import { combatState, expectClientMatchesServer, expectCoherentCombat } from "../support/invariants";

const kits: SpellType[][] = [
  ["cinderbrand", "single-heal", "stone-bark", "lightning-surge", "cinder-wisp", "basic-attack"],
  ["bladestorm-rhythm", "deflecting-stance", "iron-will", "fleetfoot-gambit", "basic-attack"],
  ["arcane-channeling", "volt-lash", "natures-embrace", "soulflare", "basic-attack"],
  ["earthshatter", "battle-roar", "torrent-spiral", "ocean-blessing", "basic-attack"],
];
let selected = 0;
for (const { value: key } of DungeonKeySchema.options) {
  const config = dungeonManager.getDungeonConfig(key);
  for (const [wave, types] of config.availableEnemies.entries()) {
    for (let trial = 0; trial < 12; trial++) {
      const seed = `${key}-wave${wave + 1}-trial${trial}`;
      if (process.env.BATTLE_SWEEP_SEED && process.env.BATTLE_SWEEP_SEED !== seed) continue;
      selected++;
      test(`${seed}: playable turns, coherent state, client parity and deterministic replay`, () => {
        const choose = seedrandom(`choices-${seed}`);
        const heroes = [0, 1].map((index) => {
          const hero = new Character(`hero-${index}`, "audit-owner", `Hero ${index}`, "TEAM_A", 300, 150,
            { strength: 18, intelligence: 25, vitality: 20, agility: trial < 6 ? 35 - index : 3 + index }, 0, 5, 0);
          hero.spells = kits[(trial + index) % kits.length]!.map((type) => createSpellFromType(`${hero.id}-${type}`, type));
          return hero;
        });
        const enemies = types.map((type, i) => createEnemyFromType(type, `${type}-${i}`));
        const builds = captureStartingBuilds([...heroes, ...enemies]);
        const bm = new BM([...heroes, ...enemies], seed);
        const replay = new BM(restoreStartingBuilds(builds), seed);
        const commands: Parameters<typeof castBattleSpell>[1][] = [];
        try {
          bm.start(); advanceBots(bm);
          replay.start(); advanceBots(replay);
          const check = () => {
            expectCoherentCombat(bm);
            expectClientMatchesServer(bm);
            expect(combatState(replay), "frozen-build command replay").toEqual(combatState(bm));
          };
          check();
          while (!bm.isGameOver() && commands.length < 150) {
            const actor = bm.getEntityById(bm.getCurrentRound().orderQueue[0]!) as Character;
            const available = actor.spells.filter((s) => s.canCast(actor));
            expect(available.length, "player has an action").toBeGreaterThan(0);
            const spell = available[Math.floor(choose() * available.length)]!;
            const request = { entityId: actor.id, spellId: spell.config.id, revision: bm.events.length };
            const legal = getBattleTargets(bm, request);
            const sample = (ids: string[], count: number) => {
              const result: string[] = [];
              while (result.length < count && ids.length) result.push(ids.splice(Math.floor(choose() * ids.length), 1)[0]!);
              return result;
            };
            const targetIds = legal.automatic ? legal.targets : [
              ...sample(legal.targets.filter((id) => bm.getEntityById(id)!.team !== actor.team), legal.enemies),
              ...sample(legal.targets.filter((id) => bm.getEntityById(id)!.team === actor.team), legal.allies),
            ];
            const command = { ...request, targetIds };
            commands.push(command);
            castBattleSpell(bm, command, "audit-owner");
            castBattleSpell(replay, command, "audit-owner");
            check();
          }
          expect(bm.isGameOver(), "battle finishes within 150 player actions").toBe(true);
        } catch (error) {
          throw new Error(`seed=${seed}; command prefix=${JSON.stringify(commands)}\n${String(error)}`, { cause: error });
        }
      });
    }
  }
}
if (!selected) throw new Error(`Unknown BATTLE_SWEEP_SEED: ${process.env.BATTLE_SWEEP_SEED}`);
