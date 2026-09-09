import SuperJSON from "superjson";
import { writeFileSync } from "node:fs";
import { encounter, snapshot } from "./encounter";
import {
  castBattleSpell,
  getBattleTargets,
  describeBattleSpell,
} from "../../apps/server/src/battle/commands";
import type { BattleMessage } from "../../apps/server/src/battle/protocol";
import type { SpellType } from "../../apps/game/src/spells/base/spell-types";

const bm = encounter();
const participants = snapshot(bm.startEntityData);
const descriptions = new Map(
  bm.entities.flatMap((e) =>
    e.spells.map((s) => [s.config.id, describeBattleSpell(bm, e, s)] as const),
  ),
);
const commands: Extract<BattleMessage, { type: "castSpell" }>[] = [];
const planned: SpellType[] = [
  "stone-bark",
  "lightning-surge",
  "festering-blow",
  "single-heal",
  "cinder-wisp",
  "natures-embrace",
  "basic-attack",
  "cinderbrand",
];
let step = 0;
while (!bm.isGameOver() && step < 100) {
  const entity = bm.getEntityById(bm.getCurrentRound().orderQueue[0])!;
  const preferred = planned[step];
  const spell =
    entity.spells.find(
      (s) => s.config.type === preferred && s.canCast(entity),
    ) ??
    entity.spells.find(
      (s) =>
        ["cinder-wisp", "cinderbrand"].includes(s.config.type) &&
        s.canCast(entity),
    ) ??
    entity.spells.find((s) => s.config.type === "basic-attack")!;
  const targets = getBattleTargets(bm, {
    entityId: entity.id,
    spellId: spell.config.id,
  });
  const command: Extract<BattleMessage, { type: "castSpell" }> = {
    type: "castSpell",
    data: {
      entityId: entity.id,
      spellId: spell.config.id,
      revision: bm.events.length,
      requestId: `recorded-command-${step}`,
      targetIds: targets.automatic
        ? targets.targets
        : [targets.targets[step % targets.targets.length]],
    },
  };
  castBattleSpell(bm, command.data, "fixture-owner");
  commands.push(command);
  step++;
}
if (!bm.isGameOver()) throw new Error("Recording failed to finish");
writeFileSync(
  new URL("./recordings/six-entity.json", import.meta.url),
  SuperJSON.stringify({
    version: 1,
    battleId: bm.battleId,
    participants,
    commands,
    descriptions,
    events: bm.events,
    effects: bm.effectTracking,
    winner: bm.getWinningTeam(),
    final: bm.entities.map((e) => ({
      id: e.id,
      health: e.health,
      mana: e.mana,
      cooldowns: new Map(e.spells.map((s) => [s.config.id, s.currentCooldown])),
      activeEffects: e.activeEffects.map((e) => e.id),
    })),
  }),
);
console.log(
  `Recorded ${commands.length} commands, ${bm.events.length} events, winner ${bm.getWinningTeam()}`,
);
