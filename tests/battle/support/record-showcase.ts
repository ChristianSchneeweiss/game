import SuperJSON from "superjson";
import { writeFileSync } from "node:fs";
import { Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { createEnemyFromType } from "../../../apps/server/src/game-usecases/enemy-factory";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import {
  advanceBots,
  castBattleSpell,
  describeBattleSpell,
  getBattleTargets,
} from "../../../apps/server/src/battle/commands";
import { snapshot } from "../encounter";
import type { EnemyType } from "../../../apps/game/src/enemies/base/enemy-types";
import type { SpellType } from "../../../apps/game/src/spells/base/spell-types";
import type { BattleMessage } from "../../../apps/server/src/battle/protocol";

/** Development art roster, resolved entirely by real battle commands. */
export function recordShowcase(
  name: string,
  enemyTypes: EnemyType[],
  kits: [SpellType[], SpellType[]],
) {
  const heroes = ["Aldric", "Seren"].map((label, index) => {
    const hero = new Character(
      `${name}-hero-${index}`,
      "fixture-owner",
      label,
      "TEAM_A",
      900,
      500,
      { intelligence: 20, vitality: 16, strength: 18, agility: 25 - index },
      0,
      5,
      0,
    );
    hero.spells = kits[index].map((type) =>
      createSpellFromType(`${hero.id}-${type}`, type),
    );
    return hero;
  });
  const enemies = enemyTypes.map((type) =>
    createEnemyFromType(type, `${name}-${type}`),
  );
  const bm = new BM([...heroes, ...enemies], `${name}-showcase-v1`);
  bm.start();
  const participants = snapshot(bm.startEntityData).map((entity, index) => ({
    ...entity,
    ...("type" in bm.startEntityData[index]
      ? { type: bm.startEntityData[index].type }
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
  advanceBots(bm);
  while (!bm.isGameOver() && commands.length < 350) {
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
      type: "castSpell",
      data: {
        entityId: entity.id,
        spellId: spell.config.id,
        revision: bm.events.length,
        requestId: `${name}-recording-${commands.length}`,
        targetIds: targets.automatic
          ? targets.targets
          : [targets.targets.at(-1)!],
      },
    };
    castBattleSpell(bm, command.data, "fixture-owner");
    commands.push(command);
    used.set(spell.config.id, (used.get(spell.config.id) ?? 0) + 1);
  }
  if (!bm.isGameOver()) throw new Error(`${name} recording did not finish`);
  const final = bm.entities.map((entity) => ({
    id: entity.id,
    health: entity.health,
    mana: entity.mana,
    dead: entity.isDead(),
  }));
  writeFileSync(
    new URL(`../recordings/${name}-showcase.json`, import.meta.url),
    SuperJSON.stringify({
      version: 1,
      battleId: bm.battleId,
      participants,
      commands,
      descriptions,
      events: bm.events,
      effects: bm.effectTracking,
      winner: bm.getWinningTeam(),
      final,
    }),
  );
  return { name, commands: commands.length, events: bm.events.length };
}
