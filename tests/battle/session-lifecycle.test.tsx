import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import SuperJSON from "superjson";
import type {
  BattleMessage,
  ResponseMessage,
} from "../../apps/server/src/battle/protocol";
import {
  availableSpells,
  castBattleSpell,
  getBattleTargets,
} from "../../apps/server/src/battle/commands";
import { encounter, snapshot } from "./encounter";

const browser = new Window({ url: "http://localhost:3001/battle/lifecycle" });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  location: browser.location,
  HTMLElement: browser.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
mock.module("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: "fixture-owner" } }),
}));

let sent: BattleMessage[];
let sockets: Socket[];
class Socket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  static CLOSING = 2;
  readyState = 0;
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (event: { data: string }) => void;
  onerror?: () => void;
  constructor(public url: string) {
    sockets.push(this);
  }
  send(message: string) {
    sent.push(SuperJSON.parse<BattleMessage>(message));
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  receive(message: ResponseMessage) {
    this.onmessage?.({ data: SuperJSON.stringify(message) });
  }
}
Object.assign(globalThis, { WebSocket: Socket });
const { useBattle } =
  await import("../../apps/client/src/routes/battle/-hooks/use-battle");
let current: ReturnType<typeof useBattle>;
let root: Root | undefined;
let bm: ReturnType<typeof encounter>;
let socket: Socket;
function Probe() {
  current = useBattle("lifecycle");
  return <output>{current.pending ? "pending" : "ready"}</output>;
}
function state(): Extract<ResponseMessage, { type: "state" }> {
  return SuperJSON.parse(
    SuperJSON.stringify({
      type: "state",
      data: {
        events: bm.events,
        effectTracking: bm.effectTracking,
        round: bm.getCurrentRound(),
        revision: bm.events.length,
        availableSpells: availableSpells(bm),
      },
    }),
  );
}
async function choose() {
  const spells = current.activeEntity!.spells;
  const spellId = (spells.find(
    (spell) => spell.config.type === "cinder-wisp",
  ) ?? spells.find((spell) => spell.config.type === "basic-attack"))!.config.id;
  await act(async () => current.getTargets(spellId));
  const request = sent
    .filter((message) => message.type === "getTargets")
    .at(-1)!;
  await act(async () =>
    socket.receive({
      type: "targets",
      data: getBattleTargets(bm, request.data),
    }),
  );
  await act(async () => current.setChosenTargets(["hatchling-0"]));
  return request;
}
beforeEach(async () => {
  sent = [];
  sockets = [];
  bm = encounter();
  root = createRoot(document.createElement("div"));
  await act(async () => root!.render(<Probe />));
  socket = sockets[0]!;
  await act(async () => {
    socket.open();
    socket.receive({
      type: "entities",
      data: { entities: snapshot(bm.startEntityData) as never },
    });
    socket.receive(state());
  });
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
});

test("an acknowledgement and cancel cannot unlock an uncertain cast", async () => {
  const targets = await choose();
  await act(async () => current.castSpell());
  const cast = sent.find((message) => message.type === "castSpell")!;
  await act(async () => {
    socket.receive({
      type: "castAccepted",
      data: { requestId: cast.data.requestId },
    });
    socket.receive({
      type: "targets",
      data: getBattleTargets(bm, targets.data),
    });
    current.cancelSpell();
    current.castSpell();
  });
  expect(current.pending).toBe(true);
  expect(current.canCast).toBe(false);
  expect(current.chosenTargets).toEqual(["hatchling-0"]);
  expect(sent.filter((message) => message.type === "castSpell")).toHaveLength(
    1,
  );
  castBattleSpell(bm, cast.data, "fixture-owner");
  await act(async () => socket.receive(state()));
  expect(current.pending).toBe(false);
  expect(current.activeSpell).toBeNull();
});

test("an overdue command stays gated until committed state arrives and then clears its warning", async () => {
  await choose();
  const schedule = browser.setTimeout;
  let overdue: (() => void) | undefined;
  browser.setTimeout = (callback, delay, ...args) => {
    const timer = schedule.call(browser, callback, delay, ...args);
    if (delay === 8000) {
      browser.clearTimeout(timer);
      overdue = () => callback(...args);
    }
    return timer;
  };
  try {
    await act(async () => current.castSpell());
    expect(overdue).toBeDefined();
    await act(async () => overdue!());
    expect(current.pending).toBe(true);
    expect(current.canCast).toBe(false);
    expect(current.error).toContain("Still awaiting the server");
    const cast = sent.find((message) => message.type === "castSpell")!;
    castBattleSpell(bm, cast.data, "fixture-owner");
    await act(async () => socket.receive(state()));
    expect(current.pending).toBe(false);
    expect(current.error).toBeUndefined();
  } finally {
    browser.setTimeout = schedule;
  }
});

test("a delayed snapshot cannot rewind an acknowledged revision or its current selection", async () => {
  const old = state();
  await choose();
  await act(async () => current.castSpell());
  const cast = sent.find((message) => message.type === "castSpell")!;
  castBattleSpell(bm, cast.data, "fixture-owner");
  const committed = state();
  await act(async () => socket.receive(committed));
  await act(async () => current.playback.skip());
  expect(current.battleState!.revision).toBeGreaterThan(old.data.revision);
  await choose();
  const selected = current.activeSpell;
  await act(async () => socket.receive(old));
  expect(current.battleState!.revision).toBe(committed.data.revision);
  expect(current.activeSpell).toBe(selected);
  expect(current.canCast).toBe(true);
});

test("an open reconnected socket needs a snapshot and never queues the previous command", async () => {
  await choose();
  await act(async () => current.castSpell());
  const count = sent.length;
  await act(async () => {
    socket.close();
    socket.open();
  });
  expect(current.canChoose).toBe(false);
  await act(async () => {
    current.getTargets("hero-0-cinder-wisp");
    current.castSpell();
  });
  expect(sent).toHaveLength(count);
  await act(async () => socket.receive(state()));
  expect(current.canChoose).toBe(true);
  expect(current.activeSpell).toBeNull();
  expect(sent).toHaveLength(count);
});

test("target responses must match the requested actor, revision and spell", async () => {
  const request = await choose();
  await act(async () => current.getTargets(request.data.spellId));
  const next = sent.filter((message) => message.type === "getTargets").at(-1)!;
  const legal = getBattleTargets(bm, next.data);
  for (const change of [
    { entityId: "another-actor" },
    { revision: legal.revision + 1 },
    { spellId: "another-spell" },
  ])
    await act(async () =>
      socket.receive({ type: "targets", data: { ...legal, ...change } }),
    );
  expect(current.validTargets).toBeNull();
  expect(current.canCast).toBe(false);
});

test("unmount ignores delayed socket callbacks and retained command handlers", async () => {
  await choose();
  const message = socket.onmessage!;
  const closed = socket.onclose!;
  const retained = current;
  const count = sent.length;
  await act(async () => root!.unmount());
  root = undefined;
  await act(async () => {
    message({ data: SuperJSON.stringify(state()) });
    closed();
    retained.castSpell();
    retained.getTargets("hero-0-cinder-wisp");
  });
  expect(sent).toHaveLength(count);
  expect(sockets).toHaveLength(1);
});
