import seedrandom from "seedrandom";
import { Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { dungeon1 } from "../../apps/game/src/dungeons/dungeon1";
import { cryptOfForgottenEchoes } from "../../apps/game/src/dungeons/crypt-of-forgotten-echoes";
import { trialOfTheAshen } from "../../apps/game/src/dungeons/trial-of-the-ashen";
import { trialOfTheNature } from "../../apps/game/src/dungeons/trial-of-the-nature";
import { trialOfTheStorm } from "../../apps/game/src/dungeons/trial-of-the-storm";
import { trialOfTheTides } from "../../apps/game/src/dungeons/trial-of-the-tides";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../apps/game/src/spells/base/spell-types";
import { createEnemyFromType } from "../../apps/server/src/game-usecases/enemy-factory";
import { advanceBots, castBattleSpell, getBattleTargets } from "../../apps/server/src/battle/commands";
import { buildTimeline } from "../../apps/client/src/routes/battle/-presentation/timeline";

// Uses real authored enemy configurations and real server commands. Player
// choices use a separate PRNG so the test never changes battle randomness.
console.log = () => {};
console.error = () => {};
const configs = [dungeon1(), cryptOfForgottenEchoes(), trialOfTheAshen(), trialOfTheNature(), trialOfTheStorm(), trialOfTheTides()];
const kits: SpellType[][] = [
  ["cinderbrand", "single-heal", "stone-bark", "lightning-surge", "cinder-wisp", "basic-attack"],
  ["bladestorm-rhythm", "deflecting-stance", "iron-will", "fleetfoot-gambit", "basic-attack"],
  ["arcane-channeling", "volt-lash", "natures-embrace", "soulflare", "basic-attack"],
  ["earthshatter", "battle-roar", "torrent-spiral", "ocean-blessing", "basic-attack"],
];
type Failure = { seed: string; step: number; kind: string; detail: unknown; commands: unknown[] };
const failures: Failure[] = [];
let scenarios = 0;
let completed = 0;
let commandsChecked = 0;
let snapshotsChecked = 0;
for (const config of configs) for (const [wave, types] of config.availableEnemies.entries()) {
  for (let trial = 0; trial < 12; trial++) {
    const seed = `${config.key}-wave${wave + 1}-trial${trial}`;
    const choose = seedrandom(`choices-${seed}`);
    const heroes = [0, 1].map(index => {
      const stats = { strength: 18, intelligence: 25, vitality: 20, agility: trial < 6 ? 35 - index : 3 + index };
      const hero = new Character(`hero-${index}`, "audit-owner", `Hero ${index}`, "TEAM_A", 300, 150, stats, 0, 5, 0);
      hero.spells = kits[(trial + index) % kits.length].map(type => createSpellFromType(`${hero.id}-${type}`, type));
      return hero;
    });
    const enemies = types.map((type, i) => createEnemyFromType(type, `${type}-${i}`));
    const bm = new BM([...heroes, ...enemies], seed);
    bm.start();
    scenarios++;
    const commands: unknown[] = [];
    let step = 0;
    let failed = false;
    const fail = (kind: string, detail: unknown) => {
      failures.push({ seed, step, kind, detail, commands });
      failed = true;
    };
    const compare = () => {
      const display = buildTimeline(bm.startEntityData, bm.events, undefined, bm.effectTracking).at(-1)!.stats;
      snapshotsChecked++;
      for (const entity of bm.entities) {
        const stat = display.get(entity.id)!;
        const expected = { health: entity.health, mana: entity.mana, dead: entity.isDead(), cooldowns: entity.spells.map(s => [s.config.id, s.currentCooldown]), effects: entity.activeEffects.map(e => e.id).sort() };
        const actual = { health: stat.health, mana: stat.mana, dead: stat.flags.dead, cooldowns: entity.spells.map(s => [s.config.id, stat.cooldowns.get(s.config.id)]), effects: [...stat.activeEffects].sort() };
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          fail("client-state-drift", { entity: entity.id, expected, actual });
          return;
        }
      }
    };
    try {
      advanceBots(bm);
      compare();
      while (!failed && !bm.isGameOver() && step < 150) {
        const actor = bm.getEntityById(bm.getCurrentRound().orderQueue[0]);
        if (!(actor instanceof Character) || actor.isDead()) {
          fail("no-playable-turn", { queue: bm.getCurrentRound().orderQueue, round: bm.getCurrentRoundNumber() });
          break;
        }
        const available = actor.spells.filter(s => s.canCast(actor));
        if (!available.length) { fail("no-player-action", actor.id); break; }
        const spell = available[Math.floor(choose() * available.length)];
        const request = { entityId: actor.id, spellId: spell.config.id, revision: bm.events.length };
        const legal = getBattleTargets(bm, request);
        const sample = (ids: string[], count: number) => {
          const result: string[] = [];
          while (result.length < count && ids.length) result.push(ids.splice(Math.floor(choose() * ids.length), 1)[0]);
          return result;
        };
        const targets = legal.automatic ? legal.targets : [
          ...sample(legal.targets.filter(id => bm.getEntityById(id)!.team !== actor.team), legal.enemies),
          ...sample(legal.targets.filter(id => bm.getEntityById(id)!.team === actor.team), legal.allies),
        ];
        const command = { ...request, targetIds: targets };
        commands.push(command);
        castBattleSpell(bm, command, "audit-owner");
        commandsChecked++;
        step++;
        compare();
      }
      if (!failed && !bm.isGameOver()) fail("action-limit", { round: bm.getCurrentRoundNumber() });
      if (!failed) completed++;
    } catch (error) {
      fail("exception", error instanceof Error ? { message: error.message, stack: error.stack?.split("\n").slice(0, 5) } : String(error));
    }
  }
}
const byKind = Object.fromEntries([...new Set(failures.map(f => f.kind))].map(kind => [kind, failures.filter(f => f.kind === kind).length]));
const summary = { scenarios, waves: configs.reduce((sum, c) => sum + c.availableEnemies.length, 0), completed, commandsChecked, snapshotsChecked, failed: failures.length, byKind };
await Bun.write(new URL("./encounter-sweep-results.json", import.meta.url), JSON.stringify({ summary, failures }, null, 2));
process.stdout.write(JSON.stringify({ summary, examples: failures.slice(0, 5) }, null, 2) + "\n");
process.exitCode = failures.length ? 1 : 0;
