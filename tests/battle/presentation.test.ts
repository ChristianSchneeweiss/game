import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import SuperJSON from "superjson";
import type { Entity } from "../../apps/game/src/entity-types";
import type { EffectTracking } from "../../apps/game/src/bm";
import type { TimelineEventFull } from "../../apps/game/src/timeline-events";
import { SpellTypeSchema } from "../../apps/game/src/spells/base/spell-types";
import { PassiveTypeSchema } from "../../apps/game/src/passive-skills/base/passive-types";
import {
  skillNames,
  conditionIconNames,
  skillIconUrl,
} from "../../apps/client/src/lib/skill-icons";
import { buildTimeline } from "../../apps/client/src/routes/battle/-presentation/timeline";
import {
  buildConditionDetails,
  conditionDetail,
  groupConditions,
} from "../../apps/client/src/routes/battle/-presentation/battle-effects";
import {
  buildActionHistory,
  visibleHistory,
} from "../../apps/client/src/routes/battle/-presentation/action-history";
import { cueDuration } from "../../apps/client/src/routes/battle/-presentation/presentation-timing";

const recording = SuperJSON.parse<{
  participants: Entity[];
  events: TimelineEventFull[];
  effects: EffectTracking;
}>(
  readFileSync(
    new URL("./recordings/six-entity.json", import.meta.url),
    "utf8",
  ),
);
const frames = buildTimeline(
  recording.participants,
  recording.events,
  undefined,
  recording.effects,
);
const conditions = buildConditionDetails(
  recording.participants,
  recording.events,
  recording.effects,
);

test("every registered skill and condition has a delivered, intact icon", () => {
  const skills = [...SpellTypeSchema.options, ...PassiveTypeSchema.options].map(
    (option) => option.value,
  );
  expect(Object.keys(skillNames).sort()).toEqual(skills.sort());
  const keys = [...skills, ...Object.keys(conditionIconNames)];
  const root = new URL("../../apps/client/public", import.meta.url);
  const report = JSON.parse(
    readFileSync(new URL(`${root}/icons/skills/v1/build-report.json`), "utf8"),
  );
  expect(report.assets).toHaveLength(keys.length);
  let bytes = 0;
  for (const key of keys) {
    const data = readFileSync(new URL(`${root}${skillIconUrl(key)}`));
    expect(data.subarray(0, 4).toString()).toBe("RIFF");
    expect(data.subarray(8, 12).toString()).toBe("WEBP");
    expect(createHash("sha256").update(data).digest("hex")).toBe(
      report.assets.find((asset: { key: string }) => asset.key === key).sha256,
    );
    bytes += data.byteLength;
  }
  expect(bytes).toBe(report.totalBytes);
  expect(bytes).toBeLessThan(1024 * 1024);
  expect(skillIconUrl("not-registered")).toBe(skillIconUrl());
});

test("recorded condition sources, stacks and removal remain aligned with the event cursor", () => {
  const buff = [...conditions.values()].find(
    (detail) => detail.category === "Buff",
  )!;
  expect(buff).toMatchObject({
    name: "Stone Bark",
    iconType: "stone-bark",
    tone: "beneficial",
  });
  const groups = groupConditions([buff.id, buff.id, "unknown"], conditions);
  expect(groups[0]).toMatchObject({ detail: buff, count: 2 });
  expect(groups[1].detail.name).toBe("Unknown condition");
  expect(frames[0].stats.get("hero-0")!.activeEffects).not.toContain(buff.id);
  expect(frames[1].stats.get("hero-0")!.activeEffects).toContain(buff.id);
  const removal = frames.find(
    (frame) =>
      frame.cue?.kind === "EFFECT_REMOVAL" && frame.cue.effectId === buff.id,
  )!;
  expect(removal.stats.get("hero-0")!.activeEffects).not.toContain(buff.id);
});

test("conditions applied by an effect retain the parent's source and unknown sources use category artwork", () => {
  const parent = [...conditions.values()].find(
    (detail) => detail.category === "Buff",
  )!;
  const effects: EffectTracking = new Map(recording.effects);
  const base = effects.get(parent.id)!;
  effects.set("child", { ...base, id: "child", effectType: "SHIELD" });
  effects.set("orphan", { ...base, id: "orphan", effectType: "CURSE" });
  const details = buildConditionDetails(
    recording.participants,
    [
      ...recording.events,
      {
        round: 9,
        event: {
          eventType: "EFFECT_TRIGGER",
          data: {
            effectId: parent.id,
            effectsApplied: new Map([["hero-0", ["child"]]]),
          },
        },
      },
    ],
    effects,
  );
  expect(conditionDetail("child", details)).toMatchObject({
    name: "Stone Bark",
    iconType: "stone-bark",
    category: "Shield",
  });
  expect(conditionDetail("orphan", details)).toMatchObject({
    name: "Curse",
    iconType: "effect-curse",
    tone: "harmful",
  });
});

test("the action log excludes future results and bookkeeping, includes healing and rewinds cleanly", () => {
  const history = buildActionHistory(
    frames,
    recording.participants,
    conditions,
  );
  expect(visibleHistory(history, 0)).toEqual([]);
  expect(visibleHistory(history, 1)).toHaveLength(1);
  expect(visibleHistory(history, 3)).toEqual(visibleHistory(history, 1));
  expect(visibleHistory(history, 1)[0]).toMatchObject({
    label: "Stone Bark",
    iconType: "stone-bark",
    results: ["Aldric: buff applied"],
  });
  expect(
    history.some(
      (entry) =>
        entry.label === "Single Heal" &&
        entry.results.some((result) => result.includes("+7 HP")),
    ),
  ).toBe(true);
  expect(history.some((entry) => entry.label === "Stone Bark ends")).toBe(true);
  expect(visibleHistory(history, frames.length - 1)).toHaveLength(12);
  expect(visibleHistory(history, 1)).toHaveLength(1);
  expect(history.filter((entry) => entry.label === "Fallen")).toHaveLength(0);
});

test("overkill reports the health actually lost and bookkeeping does not stretch animation time", () => {
  const participants = recording.participants.map((entity) => ({
    ...entity,
    health: 1,
  }));
  const events: TimelineEventFull[] = [
    {
      round: 0,
      event: {
        eventType: "EFFECT_TRIGGER",
        data: {
          effectId: "unknown",
          damageApplied: new Map([["hero-0", 999]]),
        },
      },
    },
  ];
  const history = buildActionHistory(
    buildTimeline(participants, events),
    participants,
    new Map(),
  );
  expect(history[0].results).toEqual(["Aldric: −1 HP · fallen"]);
  const total = frames
    .slice(1)
    .reduce((sum, frame) => sum + cueDuration(frame.cue), 0);
  expect(total).toBeLessThan(recording.events.length * 500);
  expect(total).toBeGreaterThan(10000);
});
