import { expect, test } from "bun:test";
import { Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { BaseEnemy } from "../../../apps/game/src/enemies/base/base.enemy";
import { passiveSkillFactory } from "../../../apps/game/src/passive-skills/base/passive-skill.factory";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../../apps/game/src/spells/base/spell-types";
import {
  advanceBots,
  castBattleSpell,
  getBattleTargets,
} from "../../../apps/server/src/battle/commands";
import { expectClientMatchesServer } from "../support/invariants";

function hero(id: string, agility: number, types: SpellType[]) {
  const character = new Character(
    id, "audit-owner", id, "TEAM_A", 500, 150,
    { intelligence: 20, vitality: 20, strength: 10, agility }, 0, 5, 0,
  );
  character.spells = types.map(type => createSpellFromType(`${id}-${type}`, type));
  return character;
}
function enemy(id = "enemy", agility = 10, health = 500) {
  return new BaseEnemy({
    id, name: id, type: "goblin", team: "TEAM_B", maxHealth: health,
    maxMana: 100,
    baseAttributes: { intelligence: 10, vitality: 10, strength: 2, agility },
    xp: 0, loot: { gold: 0, items: [] }, spells: ["basic-attack"],
  });
}
function cast(bm: BM, actor: Character, type: SpellType, targets?: string[]) {
  const data = {
    entityId: actor.id, spellId: `${actor.id}-${type}`, revision: bm.events.length,
  };
  const legal = getBattleTargets(bm, data);
  castBattleSpell(bm, { ...data, targetIds: targets ?? legal.targets }, "audit-owner");
}

function resolveCharge(bm: BM, caster: Character) {
  for (let step = 0; step < 12 && caster.activeEffects.some((e) => e.effectType === "CHARGE"); step++) {
    const actor = bm.getEntityById(bm.getCurrentRound().orderQueue[0]!);
    expect(actor, "charge must leave a playable decision").toBeInstanceOf(Character);
    const target = bm.getAliveEntities().find((e) => e.team !== actor!.team)!;
    cast(bm, actor as Character, "basic-attack", [target.id]);
  }
  expect(caster.activeEffects.some((e) => e.effectType === "CHARGE"), "charge eventually resolves").toBe(false);
}

test("channeling must not consume the following ally's combat turn", () => {
  const caster = hero("caster", 30, ["arcane-channeling", "basic-attack"]);
  const ally = hero("ally", 20, ["basic-attack"]);
  const bm = new BM([caster, ally, enemy()], "charge-skip");
  bm.start();
  cast(bm, caster, "arcane-channeling");
  expect(bm.getCurrentRoundNumber()).toBe(0);
  expect(bm.getCurrentRound().orderQueue[0]).toBe(ally.id);
  expect(bm.events.some(({ event }) =>
    event.eventType === "SPELL_CAST" && event.data.spellId === "enemy-basic-attack"
  )).toBe(false);
});

test("channeling from the last initiative slot must leave a playable turn queue", () => {
  const caster = hero("caster", 1, ["arcane-channeling", "basic-attack"]);
  const bm = new BM([caster, enemy()], "charge-deadlock");
  bm.start();
  advanceBots(bm);
  expect(bm.getCurrentRound().orderQueue).toEqual([caster.id]);
  cast(bm, caster, "arcane-channeling");
  expect(bm.isGameOver()).toBe(false);
  expect(bm.getCurrentRound().orderQueue.length).toBeGreaterThan(0);
});

test("charge release must not charge mana a second time in client reconstruction", () => {
  const caster = hero("caster", 30, ["arcane-channeling", "basic-attack"]);
  const ally = hero("ally", 20, ["basic-attack"]);
  const bm = new BM([caster, ally, enemy()], "charge-client");
  bm.start();
  cast(bm, caster, "arcane-channeling");
  resolveCharge(bm, caster);
  expectClientMatchesServer(bm);
});

test("death during charge release must not regenerate and revive the queued enemy", () => {
  const caster = hero("caster", 30, ["arcane-channeling", "basic-attack"]);
  const ally = hero("ally", 10, ["single-heal", "basic-attack"]);
  const victim = enemy("victim", 20, 10);
  const survivor = enemy("survivor", 5, 500);
  const bm = new BM([caster, ally, victim, survivor], "charge-dead-queue");
  bm.start();
  cast(bm, caster, "arcane-channeling");
  expect(bm.getCurrentRound().orderQueue[0]).toBe(ally.id);
  cast(bm, ally, "single-heal", [ally.id]);
  expect(bm.deadEntities.has(victim.id)).toBe(true);
  expect(victim.health).toBe(0);
  const deathAt = bm.events.findIndex(({ event }) => event.eventType === "DEATH" && event.data.id === victim.id);
  expect(bm.events.slice(deathAt + 1).some(({ event }) =>
    event.eventType === "SPELL_CAST" && event.data.spellId === "victim-basic-attack"
  )).toBe(false);
});

test("opening turn receives the same upkeep as later turns", () => {
  const caster = hero("caster", 30, ["single-heal", "basic-attack"]);
  caster.health = 100;
  caster.mana = 0;
  const bm = new BM([caster, enemy()], "opening-upkeep");
  bm.start();
  advanceBots(bm);
  expect(caster.health).toBe(110);
  expect(caster.mana).toBe(4);
  expect(bm.events.filter(({ event }) => event.eventType === "REGEN")).toHaveLength(1);
});

test("client preserves reflected damage followed by capped Soulflare healing", () => {
  const caster = hero("caster", 30, ["soulflare", "basic-attack"]);
  const ally = hero("ally", 20, ["basic-attack"]);
  const defender = enemy();
  defender.passiveSkills = [passiveSkillFactory("thorn-carapace", "enemy-thorns", defender)];
  const bm = new BM([caster, ally, defender], "reflection-healing-order");
  bm.start();
  cast(bm, caster, "soulflare");
  expect(caster.health).toBe(caster.maxHealth);
  expectClientMatchesServer(bm);
});
