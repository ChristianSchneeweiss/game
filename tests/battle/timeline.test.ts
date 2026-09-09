import { expect, test } from "bun:test";
import SuperJSON from "superjson";
import recordingJson from "./recordings/six-entity.json";
import type { Entity } from "../../apps/game/src/entity-types";
import type { EffectTracking } from "../../apps/game/src/bm";
import type { TimelineEventFull } from "../../apps/game/src/timeline-events";
import {
  buildTimeline,
  historyChange,
} from "../../apps/client/src/routes/battle/-presentation/timeline";
import { encounter, snapshot } from "./encounter";

type Recording = {
  participants: Entity[];
  events: TimelineEventFull[];
  effects: EffectTracking;
  final: {
    id: string;
    health: number;
    mana: number;
    cooldowns: Map<string, number>;
    activeEffects: string[];
  }[];
};
const recording = SuperJSON.deserialize<Recording>(
  recordingJson as Parameters<typeof SuperJSON.deserialize>[0],
);

test("recorded command results reconstruct exact resources, cooldowns, effects and death", () => {
  const frames = buildTimeline(
    recording.participants,
    recording.events,
    undefined,
    recording.effects,
  );
  expect(frames).toHaveLength(recording.events.length + 1);
  for (const entity of recording.final) {
    const final = frames.at(-1)!.stats.get(entity.id)!;
    expect(final.health).toBe(entity.health);
    expect(final.mana).toBe(entity.mana);
    expect(final.cooldowns).toEqual(entity.cooldowns);
    expect(final.activeEffects).toEqual(entity.activeEffects);
    expect(final.flags.dead).toBe(entity.health <= 0);
  }
  // Reconstruct any seek prefix: no hidden mutable frame state.
  for (const cursor of [0, 1, 7, 30, recording.events.length]) {
    expect(
      buildTimeline(
        recording.participants,
        recording.events.slice(0, cursor),
        undefined,
        recording.effects,
      ).at(-1)!.stats,
    ).toEqual(frames[cursor].stats);
  }
});

test("identical, appended, shortened and replaced histories are distinguished with Maps intact", () => {
  const copy = SuperJSON.parse<TimelineEventFull[]>(
    SuperJSON.stringify(recording.events),
  );
  expect(historyChange(recording.events, copy)).toBe("same");
  expect(historyChange(copy.slice(0, -1), recording.events)).toBe("append");
  expect(historyChange(recording.events, copy.slice(0, -1))).toBe("replace");
  copy[0] = {
    round: 99,
    event: { eventType: "DEATH", data: { id: "hero-0" } },
  };
  expect(historyChange(recording.events, copy)).toBe("replace");
});

test("healing and regeneration report the applied capped amount, including the last frame", () => {
  const participants = snapshot(encounter().entities);
  participants[0].health = 159;
  participants[0].mana = 149;
  const events: TimelineEventFull[] = [
    {
      round: 0,
      event: {
        eventType: "EFFECT_TRIGGER",
        data: {
          effectId: "unknown",
          healingApplied: new Map([["hero-0", 50]]),
        },
      },
    },
    {
      round: 0,
      event: {
        eventType: "REGEN",
        data: { entityId: "hero-0", healthRegen: 8, manaRegen: 10 },
      },
    },
  ];
  const frames = buildTimeline(participants, events);
  expect(frames[1].stats.get("hero-0")!.deltaHealth).toBe(1);
  expect(frames[1].cue!.label).toBe("Effect triggers");
  expect(frames[2].stats.get("hero-0")!).toMatchObject({
    health: 160,
    mana: 150,
    deltaHealth: 0,
    deltaMana: 1,
  });
});

test("display reconstruction never calls combat methods or mutates its source", () => {
  const before = SuperJSON.stringify(recording);
  const entities = recording.participants.map((e) => ({
    ...e,
    getAttribute: () => {
      throw new Error("Combat inspected");
    },
    spells: e.spells.map((s) => ({
      ...s,
      cast: () => {
        throw new Error("Combat cast");
      },
      description: () => {
        throw new Error("Combat tooltip");
      },
    })),
  })) as unknown as Entity[];
  for (let i = 0; i < 4; i++)
    buildTimeline(entities, recording.events, undefined, recording.effects);
  expect(SuperJSON.stringify(recording)).toBe(before);
});
