import { expect, test } from "bun:test";
import { Character } from "../../apps/game/src/base-entity";
import { BaseEnemy } from "../../apps/game/src/enemies/base/base.enemy";
import { BM } from "../../apps/game/src/bm";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import {
  applyActivationPlan,
  type ActionPlan,
} from "../../apps/server/src/battle/activation-plan";
import { battleAiSnapshot } from "../../apps/server/src/battle/ai-snapshot";
import { captureStartingBuilds } from "../../apps/server/src/battle/starting-builds";
import { reconstructBattle } from "../../apps/server/src/battle/reconstruct-battle";
import { tacticalState } from "./support/tactical-state";

function fixture() {
  const hero = new Character(
    "hero",
    "owner",
    "Hero",
    "TEAM_A",
    100,
    100,
    { strength: 20, intelligence: 20, vitality: 10, agility: 100 },
    0,
    1,
    0,
  );
  hero.aiControl = {
    enabled: true,
    prompt: "private instruction",
    allowConsumables: true,
  };
  hero.spells = [
    createSpellFromType("hit", "basic-attack"),
    createSpellFromType("fire", "cinder-wisp"),
  ];
  hero.health = 40;
  hero.consumables = [
    {
      version: 1,
      slot: 0,
      type: "healing-potion",
      name: "Potion",
      quantity: 1,
      restoration: { resource: "health", amount: 40 },
    },
  ];
  const enemy = new BaseEnemy({
    id: "enemy",
    type: "goblin",
    name: "Enemy",
    team: "TEAM_B",
    maxHealth: 1000,
    maxMana: 100,
    baseAttributes: {
      strength: 10,
      intelligence: 10,
      vitality: 10,
      agility: 1,
    },
    spells: ["basic-attack"],
    xp: 0,
    loot: { gold: 0 },
    aiEnabled: true,
    aiPrompt: "enemy secret",
  });
  const builds = captureStartingBuilds([hero, enemy], true);
  const grid = {
    rulesVersion: 2 as const,
    battlefield: {
      width: 7,
      height: 5,
      blocked: [{ x: 2, y: 0 }],
      layoutVersion: "test",
    },
    positions: { hero: { x: 1, y: 1 }, enemy: { x: 4, y: 1 } },
  };
  return { bm: reconstructBattle("ai-plans", builds, [], grid), builds, grid };
}

test("illegal follow-ups and movement leave the complete battle and RNG unchanged", () => {
  const { bm } = fixture();
  const before = tacticalState(bm);
  const plans: ActionPlan[] = [
    {
      destination: { x: 2, y: 1 },
      action: {
        type: "cast",
        spellId: "hit",
        selection: { aim: "tile", tile: { x: 4, y: 1 } },
      },
    },
    {
      destination: { x: 3, y: 1 },
      action: {
        type: "cast",
        spellId: "invented",
        selection: { aim: "global" },
      },
    },
    { destination: { x: 2, y: 0 }, action: { type: "endTurn" } },
    { destination: { x: 4, y: 1 }, action: { type: "endTurn" } },
    { destination: { x: 6, y: 4 }, action: { type: "endTurn" } },
    { destination: { x: 3, y: 1 }, action: { type: "consumable", slot: 1 } },
  ];
  for (const plan of plans) {
    expect(() => applyActivationPlan(bm, "hero", plan)).toThrow();
    expect(tacticalState(bm)).toEqual(before);
  }
});

test.each([
  {
    destination: { x: 3, y: 1 },
    action: {
      type: "cast",
      spellId: "hit",
      selection: { aim: "tile", tile: { x: 4, y: 1 } },
    },
  },
  {
    destination: null,
    action: {
      type: "cast",
      spellId: "fire",
      selection: { aim: "tile", tile: { x: 4, y: 1 } },
    },
  },
  { destination: null, action: { type: "consumable", slot: 0 } },
  { destination: { x: 2, y: 1 }, action: { type: "endTurn" } },
  { destination: null, action: { type: "endTurn" } },
] satisfies ActionPlan[])("legal complete plan advances once: %j", (plan) => {
  const { bm } = fixture();
  const activation = bm.grid!.activation!.id;
  applyActivationPlan(bm, "hero", plan);
  expect(bm.grid!.activation!.id).not.toBe(activation);
  expect(bm.grid!.activation!.entityId).toBe("enemy");
  if (plan.action.type === "consumable")
    expect(bm.entities[0]!.consumables![0]!.quantity).toBe(0);
});

test("remaining movement and consumable permissions are enforced", () => {
  const { bm } = fixture();
  expect(bm.moveEntity("hero", { x: 1, y: 3 })).toBe(true);
  const before = tacticalState(bm);
  expect(() =>
    applyActivationPlan(bm, "hero", {
      destination: { x: 3, y: 3 },
      action: { type: "endTurn" },
    }),
  ).toThrow();
  expect(tacticalState(bm)).toEqual(before);
  bm.entities[0]!.aiControl!.allowConsumables = false;
  expect(() =>
    applyActivationPlan(bm, "hero", {
      destination: { x: 1, y: 2 },
      action: { type: "consumable", slot: 0 },
    }),
  ).toThrow();
  expect(tacticalState(bm)).toEqual(before);
});

test("snapshot contains current mechanics, no private prompts, history or opposing kits; extraction is read-only", () => {
  const { bm } = fixture();
  const before = tacticalState(bm);
  const snapshot = battleAiSnapshot(bm);
  const text = JSON.stringify(snapshot);
  expect(text).not.toContain("private instruction");
  expect(text).not.toContain("enemy secret");
  expect(text).not.toContain("events");
  expect(snapshot.entities[1]!.spells).toBeUndefined();
  expect(snapshot.entities[0]!.spells).toHaveLength(2);
  expect(snapshot.reachable.length).toBeGreaterThan(1);
  expect(snapshot.definitions).toBeDefined();
  expect(tacticalState(bm)).toEqual(before);
});

test("legacy builds do not inherit subsequently enabled enemy defaults", () => {
  const { builds, grid } = fixture();
  builds.forEach((build) => {
    build.aiControl = undefined;
  });
  const battle = reconstructBattle("legacy-control", builds, [], grid);
  expect(
    battle.entities.every((entity) => entity.aiControl === undefined),
  ).toBe(true);
});
