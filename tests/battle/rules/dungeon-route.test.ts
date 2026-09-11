import { describe, expect, test } from "bun:test";
import seedrandom from "seedrandom";
import {
  rollDungeonRoute,
  routeEncounterCatalog,
  type RouteEncounterDefinition,
} from "../../../apps/game/src/dungeons/route-catalog";

describe("weighted expedition routes", () => {
  test("rolls repeatably, stores distinct offers, and varies between runs", () => {
    const a = rollDungeonRoute(5, seedrandom("expedition-a"));
    expect(a).toEqual(rollDungeonRoute(5, seedrandom("expedition-a")));
    expect(a).not.toEqual(rollDungeonRoute(5, seedrandom("expedition-b")));
    expect(a.forks.map((fork) => fork.wave)).toEqual([1, 2, 3, 4]);
    for (const fork of a.forks) {
      expect(fork.offers.length).toBeGreaterThanOrEqual(2);
      expect(fork.offers.length).toBeLessThanOrEqual(4);
      expect(new Set(fork.offers.map((offer) => offer.encounter.id)).size).toBe(
        fork.offers.length,
      );
      expect(fork.offers.every((offer) => !("weight" in offer.encounter))).toBe(
        true,
      );
    }
  });
  test("forks vary between two and four paths, with two most common", () => {
    const counts = new Map([
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
    for (let seed = 0; seed < 10000; seed++) {
      const route = rollDungeonRoute(5, seedrandom(`balance:${seed}`));
      for (const fork of route.forks)
        counts.set(fork.offers.length, counts.get(fork.offers.length)! + 1);
    }
    expect(counts.get(2)! / 40000).toBeCloseTo(0.6, 1);
    expect(counts.get(3)! / 40000).toBeCloseTo(0.3, 1);
    expect(counts.get(4)! / 40000).toBeCloseTo(0.1, 1);
  });
  test("encounter weights change offer frequency, including rare rooms", () => {
    const counts = new Map(routeEncounterCatalog.map((entry) => [entry.id, 0]));
    for (let sample = 0; sample < 10000; sample++) {
      const [fork] = rollDungeonRoute(
        2,
        seedrandom(`distribution:${sample}`),
      ).forks;
      for (const offer of fork!.offers)
        counts.set(offer.encounter.id, counts.get(offer.encounter.id)! + 1);
    }
    const frequencies = routeEncounterCatalog.map(
      (entry) => counts.get(entry.id)!,
    );
    for (let index = 1; index < frequencies.length; index++) {
      expect(frequencies[index - 1]!).toBeGreaterThan(frequencies[index]!);
      expect(frequencies[index]!).toBeGreaterThan(0);
    }
  });
  test("future legendary rooms can be weighted and limited to one appearance; disabled entries never roll", () => {
    const legendary: RouteEncounterDefinition = {
      id: "legendary-test",
      name: "Test sanctuary",
      kind: "shrine",
      rarity: "legendary",
      weight: 1,
      oncePerRun: true,
      actions: ["restore-health"],
    };
    const disabled: RouteEncounterDefinition = {
      ...legendary,
      id: "disabled",
      weight: 0,
    };
    const catalog = [...routeEncounterCatalog, legendary, disabled];
    let discovered = 0;
    for (let seed = 0; seed < 300; seed++) {
      const offers = rollDungeonRoute(
        10,
        seedrandom(String(seed)),
        catalog,
      ).forks.flatMap((fork) => fork.offers);
      const appearances = offers.filter(
        (offer) => offer.encounter.id === legendary.id,
      );
      expect(appearances.length).toBeLessThanOrEqual(1);
      discovered += appearances.length;
      expect(
        offers.filter((offer) => offer.encounter.id === "ancient-vault").length,
      ).toBeLessThanOrEqual(1);
      expect(offers.some((offer) => offer.encounter.id === disabled.id)).toBe(
        false,
      );
    }
    expect(discovered).toBeGreaterThan(0);
    expect(discovered).toBeLessThan(300);
  });
  test("a one-encounter dungeon needs no forks", () => {
    expect(rollDungeonRoute(1, seedrandom("single"))).toEqual({
      version: 1,
      forks: [],
      decisions: [],
    });
  });
});
