import SuperJSON from "superjson";
import { writeFileSync } from "node:fs";
import { Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { BarkhideShaman } from "../../apps/game/src/enemies/barkhide-shaman";
import { ElderTreant } from "../../apps/game/src/enemies/elder-treant";
import { HollowedOakwarden } from "../../apps/game/src/enemies/hollowed-oakwarden";
import { MossCoveredGolem } from "../../apps/game/src/enemies/moss-covered-golem";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import {
  castBattleSpell,
  describeBattleSpell,
  getBattleTargets,
} from "../../apps/server/src/battle/commands";
import { snapshot } from "./encounter";
import type { SpellType } from "../../apps/game/src/spells/base/spell-types";
import type { BattleMessage } from "../../apps/server/src/battle/protocol";

// A development art showcase, not a configured dungeon wave. All actions are
// resolved by the real battle commands; spells, targets and damage are unedited.
const heroes = ["Aldric", "Seren"].map((name, i) => {
  const hero = new Character(
    `forest-hero-${i}`,
    "fixture-owner",
    name,
    "TEAM_A",
    900,
    500,
    { intelligence: 20, vitality: 16, strength: 18, agility: 25 - i },
    0,
    5,
    0,
  );
  const types: SpellType[] =
    i === 0
      ? ["stone-bark", "single-heal", "basic-attack"]
      : ["natures-embrace", "festering-blow", "basic-attack"];
  hero.spells = types.map((type) =>
    createSpellFromType(`${hero.id}-${type}`, type),
  );
  return hero;
});
const enemies = [
  new MossCoveredGolem("forest-golem"),
  new BarkhideShaman("forest-shaman"),
  new ElderTreant("forest-elder"),
  new HollowedOakwarden("forest-oakwarden"),
];
const bm = new BM([...heroes, ...enemies], "forest-showcase-v1");
bm.start();
const participants = snapshot(bm.startEntityData).map((entity, i) => ({
  ...entity,
  ...("type" in bm.startEntityData[i]
    ? { type: bm.startEntityData[i].type }
    : {}),
}));
const descriptions = new Map(
  bm.entities.flatMap((entity) =>
    entity.spells.map(
      (spell) =>
        [spell.config.id, describeBattleSpell(bm, entity, spell)] as const,
    ),
  ),
);
const commands: Extract<BattleMessage, { type: "castSpell" }>[] = [];
const used = new Map<string, number>();
while (!bm.isGameOver() && commands.length < 250) {
  const entity = bm.getEntityById(bm.getCurrentRound().orderQueue[0])!;
  const available = entity.spells.filter((spell) => spell.canCast(entity));
  const spell = available.sort(
    (a, b) => (used.get(a.config.id) ?? 0) - (used.get(b.config.id) ?? 0),
  )[0];
  if (!spell) throw new Error(`No castable spell for ${entity.id}`);
  const targets = getBattleTargets(bm, {
    entityId: entity.id,
    spellId: spell.config.id,
  });
  const command: Extract<BattleMessage, { type: "castSpell" }> = {
    type: "castSpell" as const,
    data: {
      entityId: entity.id,
      spellId: spell.config.id,
      revision: bm.events.length,
      requestId: `forest-recording-${commands.length}`,
      targetIds: targets.automatic
        ? targets.targets
        : [targets.targets.at(-1)!],
    },
  };
  castBattleSpell(bm, command.data, "fixture-owner");
  commands.push(command);
  used.set(spell.config.id, (used.get(spell.config.id) ?? 0) + 1);
}
if (!bm.isGameOver()) throw new Error("Forest recording failed to finish");
writeFileSync(
  new URL("./recordings/forest-showcase.json", import.meta.url),
  SuperJSON.stringify({
    version: 1,
    battleId: bm.battleId,
    participants,
    commands,
    descriptions,
    events: bm.events,
    effects: bm.effectTracking,
    winner: bm.getWinningTeam(),
  }),
);
console.log(
  `Forest showcase: ${commands.length} commands, ${bm.events.length} events.`,
);
