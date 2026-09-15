import { describe, expect, test } from "bun:test";
import { quietProbe } from "./engine";
import { fixture, probes } from "./fixtures";
import { DamageOverTimeEffect } from "../../apps/game/src/effect/dot.effect";
import { HealingOverTimeEffect } from "../../apps/game/src/effect/hot.effect";

const seed = "might-v1-000";
const run = (id: string) => quietProbe(probes.find((probe) => probe.id === id)!, seed);

describe("Might calibration lifecycle", () => {
  test("casts require a prepared activation and do not progress the queue themselves", () => {
    const { bm, caster } = fixture({ id: "lifecycle", rounds: 1, stat: 20 }, seed);
    const aim = { aim: "tile", tile: { x: 3, y: 2 } } as const;
    expect(bm.safeCastSpatial(caster.id, caster.spells[0]!.config.id, aim)).toBeNull();
    bm.preTurn();
    expect(bm.safeCastSpatial(caster.id, caster.spells[0]!.config.id, aim)).not.toBeNull();
    expect(bm.getCurrentRound().orderQueue[0]).toBe(caster.id);
    bm.postTurn(caster.id);
    expect(bm.getCurrentRound().orderQueue[0]).toBe("enemy-0");
  });
  test("cooldown 2 permits casts in rounds 0, 3, 6", () => {
    expect(run("fireball-cadence").casts.filter((cast) => cast.spell === "fireball").map((cast) => cast.round)).toEqual([0, 3, 6]);
  });
  test("charge resolves on the blocked turn, consumes no second payment, and resumes next round", () => {
    expect(run("arcane-before-discharge").damageByActor.caster).toBe(0);
    const discharged = run("arcane-one-20");
    expect(discharged.casts.map((cast) => [cast.round, cast.origin])).toEqual([[0, "cast"], [1, "delayed"]]);
    expect(discharged.activationsByActor.caster).toBe(1);
    expect(discharged.resourceChanges.caster!.manaSpent).toBe(40);
    expect(run("arcane-resume").decisions.filter((decision) => decision.actor === "caster").map((decision) => decision.round)).toEqual([0, 2]);
  });
  test("Fleetfoot creates one next-round activation for its recipient", () => {
    const self = run("fleet-self");
    expect(self.activationsByActor.caster).toBe(3);
    expect(self.casts.filter((cast) => cast.spell === "basic-attack")).toHaveLength(2);
    const partner = run("fleet-partner");
    expect(partner.activationsByActor.caster).toBe(2);
    expect(partner.activationsByActor.partner).toBe(3);
  });
  test("guaranteed stun consumes the target turn before it can retaliate", () => {
    const result = run("bulwark-cadence");
    expect(result.activationsByActor["enemy-0"]).toBe(2);
    expect(result.blockedTurns.map((turn) => turn.round)).toEqual([0, 3]);
    expect(result.resourceChanges.caster!.usefulHealthRegen).toBe(16);
    expect(run("sword-retaliation").activationsByActor["enemy-0"]).toBe(4);
  });
  test("healing and execution report useful applied HP only", () => {
    expect(run("heal-full").healingByActor.caster).toBe(0);
    expect(run("verdict-10pct").damageByActor.caster).toBe(100);
    expect(run("verdict-10pct-high-armor").damageByActor.caster).toBe(0);
  });
  test("seeds reproduce complete traces", () => {
    expect(run("fleet-partner")).toEqual(run("fleet-partner"));
  });
  test("multi-enemy activations and clear/defeat outcomes are explicit", () => {
    expect(run("arcane-four-20").enemyActivations).toBe(8);
    expect(run("arcane-four-20").activationsByActor["enemy-0"]).toBe(2);
    expect(run("verdict-10pct").winningTeam).toBe("TEAM_A");
    expect(run("verdict-10pct").deadEnemyCount).toBe(1);
    const defeat = quietProbe({ id: "defeat", stat: 0, casterHealth: 1, rounds: 1, retaliate: true }, seed);
    expect(defeat.winningTeam).toBe("TEAM_B");
    expect(defeat.deadEnemyCount).toBe(0);
  });
  test("real periodic damage and healing do not become innate regeneration", () => {
    const result = quietProbe({ id: "periodic", stat: 20, casterHealth: 500, rounds: 1 }, seed,
      ({ bm, caster, enemies }) => {
        const dot = new DamageOverTimeEffect(2, 7, "MAGICAL");
        const hot = new HealingOverTimeEffect(2, 11);
        bm.handler.effect(enemies[0]!.spells[0]!, dot, enemies[0]!, caster);
        bm.handler.effect(caster.spells[0]!, hot, caster, caster);
      });
    expect(result.triggers).toHaveLength(2);
    expect(result.resourceChanges.caster!.damageTaken).toBe(7);
    expect(result.resourceChanges.caster!.healingTaken).toBe(11);
    expect(result.resourceChanges.caster!.usefulHealthRegen).toBe(8);
    expect(result.resourceChanges.caster!.final.health).toBe(512);
  });
  test("already-executed boundary effects and final HP share one accounting cutoff", () => {
    const result = quietProbe({ id: "boundary", stat: 20, casterHealth: 500, rounds: 1 }, seed,
      ({ bm, caster }) => {
        const hot = new HealingOverTimeEffect(3, 7);
        bm.handler.effect(caster.spells[0]!, hot, caster, caster);
        // A deliberate test lifecycle hook runs a real attached effect at the
        // boundary; it adds no mocked resource writes or game-source changes.
        bm.lifeCycleHooks.push({ onPreRound() {
          if (bm.getCurrentRoundNumber() === 1) hot.onEndStep();
        } });
      });
    expect(result.triggers.map((trigger) => trigger.round)).toEqual([0, 1]);
    expect(result.healingByActor.caster).toBe(14);
    expect(result.resourceChanges.caster!.usefulHealthRegen).toBe(8);
    expect(result.resourceChanges.caster!.final.health).toBe(522);
    expect(result.activationsByActor.caster).toBe(1);
  });
});
