import { describe, expect, test } from "bun:test";
import SuperJSON from "superjson";
import {
  castBattleSpell,
  getBattleTargets,
} from "../../apps/server/src/battle/commands";
import { messageSchema } from "../../apps/server/src/battle/protocol";
import { encounter } from "./encounter";
import { DamageOverTimeEffect } from "../../apps/game/src/effect/dot.effect";

const owner = "fixture-owner";
const request = (spell = "cinder-wisp", targetIds = ["hatchling-1"]) => ({
  entityId: "hero-0",
  spellId: `hero-0-${spell}`,
  targetIds,
});
const state = (bm: ReturnType<typeof encounter>) =>
  SuperJSON.stringify({
    events: bm.events,
    round: bm.getCurrentRound(),
    resources: bm.entities.map((e) => [
      e.id,
      e.health,
      e.mana,
      e.spells.map((s) => s.currentCooldown),
    ]),
    rng: bm.rng.state!(),
  });

describe("existing server command boundary", () => {
  test("requesting legal targets does not cast; the chosen enemy receives the resolved damage", () => {
    const bm = encounter();
    const before = state(bm);
    const legal = getBattleTargets(bm, {
      ...request(),
      requestId: "target-1",
      revision: bm.events.length,
    });
    expect(legal.targets).toEqual([
      "hatchling-0",
      "hatchling-1",
      "hatchling-2",
      "hatchling-3",
    ]);
    expect(legal.automatic).toBe(false);
    expect(legal.requestId).toBe("target-1");
    expect(state(bm)).toBe(before);
    castBattleSpell(bm, request(), owner);
    expect(bm.getEntityById("hatchling-1")!.health).toBeLessThan(40);
    expect(bm.getEntityById("hatchling-0")!.health).toBe(40);
    expect(bm.getCurrentRound().orderQueue[0]).toBe("hero-1");
    expect(bm.getEntityById("hero-0")!.mana).toBe(140);
  });
  test.each([
    ["non-owner", request(), "spectator"],
    ["out of turn", { ...request(), entityId: "hero-1" }, owner],
    ["unowned spell", { ...request(), spellId: "hero-1-cinderbrand" }, owner],
    ["missing targets", request("cinder-wisp", []), owner],
    [
      "too many targets",
      request("cinder-wisp", ["hatchling-0", "hatchling-1"]),
      owner,
    ],
    [
      "duplicate targets",
      request("cinder-wisp", ["hatchling-0", "hatchling-0"]),
      owner,
    ],
    ["illegal team", request("cinder-wisp", ["hero-0"]), owner],
    ["unknown target", request("cinder-wisp", ["missing"]), owner],
    ["stale revision", { ...request(), revision: 999 }, owner],
  ])(
    "rejects %s without consuming turn, mana, cooldowns or randomness",
    (_name, data, userId) => {
      const bm = encounter();
      const before = state(bm);
      expect(() => castBattleSpell(bm, data, userId)).toThrow();
      expect(state(bm)).toBe(before);
    },
  );
  test("unavailable mana, cooldown and dead targets are rejected", () => {
    for (const alter of [
      (bm: ReturnType<typeof encounter>) => {
        bm.entities[0].mana = 0;
      },
      (bm: ReturnType<typeof encounter>) => {
        bm.entities[0].spells[0].currentCooldown = 1;
      },
      (bm: ReturnType<typeof encounter>) => {
        bm.getEntityById("hatchling-1")!.health = 0;
      },
    ]) {
      const bm = encounter();
      alter(bm);
      const before = state(bm);
      expect(() => castBattleSpell(bm, request(), owner)).toThrow();
      expect(state(bm)).toBe(before);
    }
  });
  test("self and complete-team target sets are automatic and validated", () => {
    const bm = encounter();
    const self = getBattleTargets(bm, request("stone-bark"));
    expect(self).toMatchObject({
      targets: ["hero-0"],
      automatic: true,
      allies: 1,
      enemies: 0,
    });
    castBattleSpell(bm, request("stone-bark", ["hero-0"]), owner);
    expect(bm.entities[0].activeEffects.length).toBe(1);
    const team = {
      entityId: "hero-1",
      spellId: "hero-1-natures-embrace",
      targetIds: ["hero-0", "hero-1"],
    };
    expect(getBattleTargets(bm, team)).toMatchObject({
      targets: ["hero-0", "hero-1"],
      automatic: true,
    });
    expect(() =>
      castBattleSpell(bm, { ...team, targetIds: ["hero-0"] }, owner),
    ).toThrow();
    castBattleSpell(bm, team, owner);
    expect(
      bm.events.some(
        (e) =>
          e.event.eventType === "SPELL_CAST" &&
          e.event.data.spellId.startsWith("hatchling"),
      ),
    ).toBe(true);
  });
  test("duplicate commands remain rejected when the same character becomes active again", () => {
    const bm = encounter({ enemies: 1 });
    const data = {
      ...request("basic-attack", ["hatchling-0"]),
      revision: bm.events.length,
      requestId: "one-cast",
    };
    castBattleSpell(bm, data, owner);
    castBattleSpell(
      bm,
      {
        entityId: "hero-1",
        spellId: "hero-1-basic-attack",
        targetIds: ["hatchling-0"],
      },
      owner,
    );
    expect(bm.getCurrentRound().orderQueue[0]).toBe("hero-0");
    const before = state(bm);
    expect(() => castBattleSpell(bm, data, owner)).toThrow();
    expect(state(bm)).toBe(before);
  });
  test("the real enemy turn driver can finish both victory and defeat", () => {
    for (const health of [160, 1]) {
      const bm = encounter({ health, enemies: health === 1 ? 4 : 1 });
      let turns = 0;
      while (!bm.isGameOver() && turns++ < 100) {
        const entity = bm.getEntityById(bm.getCurrentRound().orderQueue[0])!;
        const spell = entity.spells.find(
          (s) => s.config.type === "basic-attack",
        )!;
        const targets = getBattleTargets(bm, {
          entityId: entity.id,
          spellId: spell.config.id,
        });
        castBattleSpell(
          bm,
          {
            entityId: entity.id,
            spellId: spell.config.id,
            targetIds: [targets.targets[0]],
          },
          owner,
        );
      }
      expect(bm.isGameOver()).toBe(true);
      expect(bm.getWinningTeam()).toBe(health === 1 ? "TEAM_B" : "TEAM_A");
    }
  });
  test("lethal effect damage records its impact and death without a subsequent cast", () => {
    const bm = encounter({ enemies: 1 });
    const source = bm.entities[0],
      target = bm.getEntityById("hatchling-0")!;
    const dot = new DamageOverTimeEffect(2, 100, "MAGICAL");
    dot.id = "lethal-dot";
    bm.handler.effect(source.spells[0], dot, source, target);
    dot.onPostRound();
    expect(bm.isGameOver()).toBe(true);
    expect(bm.events.slice(-2).map((e) => e.event.eventType)).toEqual([
      "EFFECT_TRIGGER",
      "DEATH",
    ]);
    expect(bm.spellCastBuffer).toHaveLength(0);
  });
  test("wire serialization preserves target request correlation", () => {
    const command = {
      type: "getTargets",
      data: { ...request(), requestId: "fresh", revision: 0 },
    };
    expect(
      messageSchema.parse(SuperJSON.parse(SuperJSON.stringify(command))),
    ).toMatchObject({ data: { requestId: "fresh", revision: 0 } });
  });
});
