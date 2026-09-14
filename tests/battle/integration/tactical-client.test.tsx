import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import SuperJSON from "superjson";
import { BaseEntity, Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../../apps/game/src/spells/base/spell-types";
import {
  applyGridCommand,
  availableSpells,
} from "../../../apps/server/src/battle/commands";
import type {
  BattleMessage,
  GridCommand,
  ResponseMessage,
} from "../../../apps/server/src/battle/protocol";
import { snapshot } from "../encounter";

const browser = new Window({ url: "http://localhost:3001/battle/tactical" });
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
let sockets: Socket[] = [];
let sent: BattleMessage[] = [];
class Socket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 0;
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (event: { data: string }) => void;
  constructor(public url: string) {
    sockets.push(this);
  }
  send(message: string) {
    sent.push(SuperJSON.parse(message));
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  receive(response: ResponseMessage) {
    this.onmessage?.({ data: SuperJSON.stringify(response) });
  }
}
Object.assign(globalThis, { WebSocket: Socket });
const { useBattle } =
  await import("../../../apps/client/src/routes/battle/-hooks/use-battle");
const { TacticalBoard, TacticalActions } =
  await import("../../../apps/client/src/routes/battle/-presentation/tactical-board");
const { usePlayback } =
  await import("../../../apps/client/src/routes/battle/-presentation/use-playback");
let session: ReturnType<typeof useBattle>;
let root: Root, socket: Socket, bm: BM, container: HTMLElement;
function Probe() {
  session = useBattle("tactical");
  return (
    <>
      {session.playback.grid && (
        <TacticalBoard
          grid={session.playback.grid}
          participants={session.participants}
          stats={session.playback.stats}
          session={session}
        />
      )}
      <TacticalActions session={session} />
      <button onClick={session.castSpell} disabled={!session.canCast}>
        Cast
      </button>
    </>
  );
}
function state() {
  socket.receive({
    type: "state",
    data: {
      events: bm.events,
      effectTracking: bm.effectTracking,
      round: bm.getCurrentRound(),
      revision: bm.revision,
      grid: bm.grid,
      actors: bm.entities.map((entity) => ({
        id: entity.id,
        team: entity.team,
        health: entity.health,
        movement: entity.getAttribute("movement"),
      })),
      availableSpells: availableSpells(bm),
    },
  });
}
function mutations() {
  return sent.filter((message): message is GridCommand =>
    ["move", "endTurn", "castSpatial"].includes(message.type),
  );
}
function tile(x: number, y: number) {
  return container.querySelector<HTMLButtonElement>(
    `button[aria-label^="Tile ${x + 1}, ${y + 1}:"]`,
  )!;
}
async function mount(enemyTile = { x: 4, y: 4 }) {
  const hero = new Character(
    "hero",
    "fixture-owner",
    "Aldric",
    "TEAM_A",
    1000,
    1000,
    { strength: 20, intelligence: 20, vitality: 20, agility: 100 },
    0,
    1,
    0,
  );
  const partner = new Character(
    "partner",
    "partner-owner",
    "Seren",
    "TEAM_A",
    1000,
    1000,
    { strength: 20, intelligence: 20, vitality: 20, agility: 90 },
    0,
    1,
    0,
  );
  hero.spells = (
    [
      "basic-attack",
      "charred-chains",
      "fireball",
      "precise-thrust",
      "festering-blow",
      "storm-pulse",
      "final-verdict",
    ] as SpellType[]
  ).map((type) => createSpellFromType(type, type));
  const enemy = new BaseEntity("enemy", "Guardian", "TEAM_B", 1000, 1000, {
    strength: 10,
    intelligence: 10,
    vitality: 20,
    agility: 5,
  });
  bm = new BM([hero, partner, enemy], "tactical-client", {
    rulesVersion: 2,
    battlefield: {
      width: 11,
      height: 9,
      blocked: [{ x: 1, y: 3 }],
      layoutVersion: "test-v1",
    },
    positions: {
      hero: { x: 1, y: 4 },
      partner: { x: 2, y: 4 },
      enemy: enemyTile,
    },
  });
  bm.start();
  bm.preTurn();
  await act(async () => root.render(<Probe />));
  socket = sockets.at(-1)!;
  await act(async () => {
    socket.open();
    const entities = snapshot(bm.startEntityData).map((entity) => ({
      ...entity,
      ...(entity.id === "partner" ? { userId: "partner-owner" } : {}),
      weaponAttackProfile: bm.getEntityById(entity.id)?.weaponAttackProfile,
    }));
    socket.receive({ type: "entities", data: { entities: entities as never } });
    state();
  });
  await act(async () => session.playback.skip());
}
async function acceptLast() {
  const command = mutations().at(-1)!;
  applyGridCommand(bm, command, "fixture-owner");
  await act(async () => {
    socket.receive({
      type: "castAccepted",
      data: { requestId: command.data.requestId },
    });
    state();
  });
  await act(async () => session.playback.skip());
}
beforeEach(() => {
  sockets = [];
  sent = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = "";
});
afterAll(() => browser.happyDOM.close());

test("rectangular accessible board plans movement without spending, commits exact path, then invalidates pending aim", async () => {
  await mount();
  expect(container.querySelectorAll('[role="gridcell"]').length).toBe(99);
  const mana = bm.getEntityById("hero")!.mana;
  await act(async () => tile(1, 5).click());
  expect(session.tactical?.path).toEqual([{ x: 1, y: 5 }]);
  expect(mutations()).toHaveLength(0);
  expect(bm.grid?.positions.hero).toEqual({ x: 1, y: 4 });
  await act(async () => {
    session.tactical?.move();
    session.tactical?.move();
  });
  expect(mutations()).toHaveLength(1);
  expect(session.pending).toBe(true);
  await acceptLast();
  expect(session.playback.grid?.positions.hero).toEqual({ x: 1, y: 5 });
  expect(session.tactical?.remaining).toBe(2);
  expect(session.tactical?.destination).toBeUndefined();
  expect(bm.getEntityById("hero")!.mana).toBe(mana);
  expect(session.pending).toBe(false);
});

test("empty tile area aim and entity selection share server recipients; casting remains explicit", async () => {
  await mount();
  const rng = SuperJSON.stringify(bm.rng.state!());
  await act(async () => session.getTargets("charred-chains"));
  await act(async () => tile(3, 4).click());
  expect(session.tactical?.selection).toEqual({
    aim: "tile",
    tile: { x: 3, y: 4 },
  });
  expect(session.chosenTargets).toEqual(["enemy"]);
  expect(session.canCast).toBe(true);
  expect(mutations()).toHaveLength(0);
  expect(SuperJSON.stringify(bm.rng.state!())).toBe(rng);
  await act(async () => session.castSpell());
  await acceptLast();
  const cast = bm.events.find(
    ({ event }) =>
      event.eventType === "SPELL_CAST" &&
      event.data.spellId === "charred-chains",
  )!.event;
  if (cast.eventType !== "SPELL_CAST") throw new Error("Missing cast");
  expect(cast.data.spatial?.recipientIds).toEqual(["enemy"]);
  expect(session.activeSpell).toBeNull();
  expect(session.ownsTurn).toBe(false);
  expect(session.canChoose).toBe(false);
  const count = mutations().length;
  await act(async () => session.tactical?.endTurn());
  expect(mutations()).toHaveLength(count);
});

test("cardinal aim, random global previews and keyboard navigation never submit a command", async () => {
  await mount();
  await act(async () => {
    tile(1, 4).focus();
    tile(1, 4).dispatchEvent(
      new browser.KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
      }) as unknown as KeyboardEvent,
    );
  });
  expect(document.activeElement).toBe(tile(1, 5));
  await act(async () => session.getTargets("precise-thrust"));
  await act(async () => session.tactical?.selectDirection("east"));
  expect(session.tactical?.selection).toEqual({
    aim: "direction",
    direction: "east",
  });
  expect(session.canCast).toBe(false);
  await act(async () => session.getTargets("storm-pulse"));
  expect(session.automaticTargets).toBe(true);
  expect(session.chosenTargets).toEqual(["enemy"]);
  expect(session.canCast).toBe(true);
  expect(mutations()).toHaveLength(0);
  await act(async () => socket.close());
  expect(session.canChoose).toBe(false);
  expect(session.canCast).toBe(false);
  expect(session.activeSpell).toBeNull();
  await act(async () => {
    socket.open();
    state();
  });
  expect(session.tactical?.remaining).toBe(3);
  expect(session.activeSpell).toBeNull();
});

test("directional targeting selects distant recipients and empty footprint tiles", async () => {
  await mount({ x: 3, y: 4 });
  await act(async () => session.getTargets("precise-thrust"));
  expect(session.validTargets).toContain("enemy");
  await act(async () => tile(2, 4).click());
  expect(session.chosenTargets).toEqual(["enemy"]);
  await act(async () => session.setChosenTargets(["enemy"]));
  expect(session.tactical?.selection).toEqual({
    aim: "direction",
    direction: "east",
  });
  expect(session.canCast).toBe(true);
  expect(mutations()).toHaveLength(0);
  await act(async () => {
    session.cancelSpell();
    session.getTargets("precise-thrust");
  });
  await act(async () => tile(3, 3).click());
  expect(session.tactical?.selection).toBeUndefined();
  await act(async () => tile(1, 2).click());
  expect(session.tactical?.selection).toEqual({
    aim: "direction",
    direction: "north",
  });
  expect(session.canCast).toBe(false);
  await act(async () => tile(3, 4).click());
  expect(session.chosenTargets).toEqual(["enemy"]);
});

test("an out-of-range Final Verdict shows reach and a confirmed move into casting range", async () => {
  await mount({ x: 3, y: 5 });
  await act(async () => session.getTargets("final-verdict"));
  expect(session.tactical?.legal).toHaveLength(0);
  expect(session.tactical?.spellGuidance?.range).toHaveLength(4);
  expect(tile(1, 5).dataset.spellRange).toBe("true");
  expect(tile(2, 5).dataset.castPosition).toBe("true");
  expect(tile(3, 4).dataset.castPosition).toBe("false");
  expect(session.canCast).toBe(false);
  expect(mutations()).toHaveLength(0);

  await act(async () => tile(2, 5).click());
  expect(session.tactical?.destination).toEqual({ x: 2, y: 5 });
  expect(session.tactical?.path).toHaveLength(2);
  expect(session.activeSpell).toBeNull();
  expect(mutations()).toHaveLength(0);
  await act(async () => session.tactical?.move());
  await acceptLast();
  expect(bm.grid?.positions.hero).toEqual({ x: 2, y: 5 });
  expect(session.tactical?.remaining).toBe(1);

  await act(async () => session.getTargets("final-verdict"));
  expect(session.tactical?.spellGuidance?.castPositions).toEqual([]);
  expect(tile(3, 5).dataset.anchor).toBe("true");
  await act(async () => tile(3, 5).click());
  expect(session.chosenTargets).toEqual(["enemy"]);
  expect(session.canCast).toBe(true);
  expect(mutations()).toHaveLength(1);
});

test("actor targeting finds a legal directional cleave for a diagonal recipient", async () => {
  await mount({ x: 2, y: 3 });
  await act(async () => session.getTargets("festering-blow"));
  await act(async () => session.tactical?.selectActor("enemy"));
  expect(session.tactical?.selection).toEqual({
    aim: "direction",
    direction: "north",
  });
  expect(session.chosenTargets).toEqual(["enemy"]);
  expect(session.canCast).toBe(true);
  expect(mutations()).toHaveLength(0);
});

test("spatial playback, reduced motion, seeking and skipping settle on identical recorded positions and resources", async () => {
  await mount();
  expect(bm.moveEntity("hero", { x: 1, y: 5 })).toBe(true);
  expect(bm.moveEntity("hero", { x: 2, y: 5 })).toBe(true);
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const realTimeout = browser.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  browser.setTimeout = ((callback: () => void) => {
    const id = ++timerId;
    timers.set(id, callback);
    return id;
  }) as unknown as typeof browser.setTimeout;
  globalThis.clearTimeout = ((id: number) =>
    timers.delete(id)) as unknown as typeof clearTimeout;
  let replay!: ReturnType<typeof usePlayback>;
  function ReplayProbe() {
    replay = usePlayback(
      bm.startEntityData,
      bm.events,
      bm.effectTracking,
      0,
      true,
    );
    return <output>{replay.grid?.positions.hero.x}</output>;
  }
  try {
    await act(async () => root.render(<ReplayProbe />));
    for (const [speed, reduced] of [
      [1, false],
      [4, false],
      [1, true],
    ] as const) {
      await act(async () => {
        replay.seek(0);
        replay.setSpeed(speed);
        replay.setReducedMotion(reduced);
        replay.setPlaying(true);
      });
      let steps = 0;
      while (!replay.caughtUp && steps++ < 50) {
        const [id, callback] = timers.entries().next().value!;
        timers.delete(id);
        await act(async () => callback());
      }
      expect(replay.caughtUp).toBe(true);
      expect(replay.grid).toEqual(bm.grid);
      expect(replay.stats.get("hero")?.mana).toBe(
        bm.getEntityById("hero")!.mana,
      );
    }
    const firstMove = replay.frames.findIndex(
      (frame) => frame.event?.event.eventType === "MOVE",
    );
    await act(async () => {
      replay.setPlaying(false);
      replay.seek(firstMove);
    });
    expect(replay.grid?.positions.hero).toEqual({ x: 1, y: 5 });
    expect(replay.grid?.activation?.spent).toBe(1);
    await act(async () => replay.skip());
    expect(replay.grid).toEqual(bm.grid);
    expect(mutations()).toHaveLength(0);
  } finally {
    await act(async () => replay?.setPlaying(false));
    browser.setTimeout = realTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
});
