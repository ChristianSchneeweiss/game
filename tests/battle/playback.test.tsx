import { afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import SuperJSON from "superjson";
import type { Entity } from "../../apps/game/src/entity-types";
import type { EffectTracking } from "../../apps/game/src/bm";
import type { TimelineEventFull } from "../../apps/game/src/timeline-events";
import { usePlayback } from "../../apps/client/src/routes/battle/-presentation/use-playback";

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
let current: ReturnType<typeof usePlayback>;
let root: Root;
let timers: Map<number, { delay: number; callback: () => void }>;
let nextTimer = 0;
const realClearTimeout = globalThis.clearTimeout;
function Probe({
  events = recording.events,
  reset = 0,
  replay = true,
}: {
  events?: TimelineEventFull[];
  reset?: number;
  replay?: boolean;
}) {
  current = usePlayback(
    recording.participants,
    events,
    recording.effects,
    reset,
    replay,
  );
  return <output>{current.cursor}</output>;
}
beforeEach(async () => {
  const browser = new Window();
  Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  timers = new Map();
  nextTimer = 0;
  browser.setTimeout = ((callback: () => void, delay: number) => {
    const id = ++nextTimer;
    timers.set(id, { callback, delay });
    return id;
  }) as typeof browser.setTimeout;
  globalThis.clearTimeout = ((id: number) =>
    timers.delete(id)) as unknown as typeof clearTimeout;
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Probe />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  globalThis.clearTimeout = realClearTimeout;
});
async function tick() {
  const [id, timer] = timers.entries().next().value!;
  timers.delete(id);
  await act(async () => timer.callback());
  return timer.delay;
}

test("replay changes display resources at impact and pause/seek cancel queued timers", async () => {
  expect(timers.size).toBe(0);
  const initial = current.stats;
  await act(async () => current.setPlaying(true));
  expect(current.stats).toEqual(initial);
  expect(await tick()).toBe(450);
  expect(current.impact).toBe(true);
  expect(current.stats).toEqual(current.frames[1].stats);
  await act(async () => current.setPlaying(false));
  expect(timers.size).toBe(0);
  await act(async () => current.seek(30));
  expect(current.stats).toEqual(current.frames[30].stats);
  expect(current.impact).toBe(false);
  expect(timers.size).toBe(0);
});

test("normal, accelerated, reduced-motion, skip and seek reach exactly the same recorded state", async () => {
  const final = current.frames.at(-1)!.stats;
  for (const [speed, reduced] of [
    [1, false],
    [4, false],
    [1, true],
  ] as const) {
    await act(async () => {
      current.seek(0);
      current.setSpeed(speed);
      current.setReducedMotion(reduced);
      current.setPlaying(true);
    });
    let steps = 0;
    while (!current.caughtUp && steps++ < 200) await tick();
    expect(current.caughtUp).toBe(true);
    expect(current.stats).toEqual(final);
  }
  await act(async () => {
    current.setPlaying(false);
    current.seek(0);
  });
  await act(async () => current.skip());
  expect(current.stats).toEqual(final);
});

test("identical updates do not replay, divergent histories cancel cues, and live reconnect catches up", async () => {
  await act(async () => current.skip());
  await act(async () =>
    root.render(
      <Probe events={SuperJSON.parse(SuperJSON.stringify(recording.events))} />,
    ),
  );
  expect(current.caughtUp).toBe(true);
  expect(timers.size).toBe(0);
  await act(async () =>
    root.render(<Probe events={recording.events.slice(0, 8)} />),
  );
  expect(current.cursor).toBe(0);
  expect(current.impact).toBe(false);
  await act(async () => root.render(<Probe replay={false} reset={1} />));
  expect(current.caughtUp).toBe(true);
  expect(timers.size).toBe(0);
});
