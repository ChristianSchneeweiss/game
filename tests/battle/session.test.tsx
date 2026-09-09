import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import SuperJSON from "superjson";
import type {
  ResponseMessage,
  BattleMessage,
} from "../../apps/server/src/battle/protocol";
import {
  castBattleSpell,
  getBattleTargets,
  availableSpells,
} from "../../apps/server/src/battle/commands";
import { encounter, snapshot } from "./encounter";

const browserWindow = new Window({
  url: "http://localhost:3001/battle/fixture",
});
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  navigator: browserWindow.navigator,
  location: browserWindow.location,
  HTMLElement: browserWindow.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
let userId = "fixture-owner";
mock.module("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: userId } }),
}));
let sockets: Socket[] = [];
let sent: BattleMessage[] = [];
class Socket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  static CLOSING = 2;
  readyState = 0;
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;
  constructor(public url: string) {
    sockets.push(this);
  }
  send(message: string) {
    sent.push(SuperJSON.parse<BattleMessage>(message));
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(response: ResponseMessage) {
    this.onmessage?.({ data: SuperJSON.stringify(response) });
  }
}
Object.assign(globalThis, { WebSocket: Socket });
const { useBattle } =
  await import("../../apps/client/src/routes/battle/-hooks/use-battle");
let current: ReturnType<typeof useBattle>;
let root: Root;
let bm: ReturnType<typeof encounter>;
let socket: Socket;
function Probe({ alternate = false }: { alternate?: boolean }) {
  current = useBattle("fixture");
  return (
    <div>
      {alternate ? "3D presentation" : "Cards presentation"}
      <button onClick={current.castSpell} disabled={!current.canCast}>
        Cast
      </button>
    </div>
  );
}
const receiveState = () =>
  socket.receive({
    type: "state",
    data: {
      events: bm.events,
      effectTracking: bm.effectTracking,
      round: bm.getCurrentRound(),
      revision: bm.events.length,
      availableSpells: availableSpells(bm),
    },
  });
const choose = async (type = "cinder-wisp") => {
  await act(async () => current.getTargets(`hero-0-${type}`));
  const request = sent
    .filter((message) => message.type === "getTargets")
    .at(-1)!;
  if (request.type !== "getTargets") throw new Error("No target request");
  await act(async () =>
    socket.receive({
      type: "targets",
      data: getBattleTargets(bm, request.data),
    }),
  );
};
beforeEach(async () => {
  userId = "fixture-owner";
  sockets = [];
  sent = [];
  bm = encounter();
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Probe />));
  socket = sockets[0];
  await act(async () => {
    socket.open();
    socket.receive({
      type: "entities",
      data: { entities: snapshot(bm.startEntityData) as never },
    });
    receiveState();
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = "";
});

test("select/change/cancel emits no cast; explicit Cast submits once and resolves the chosen enemy", async () => {
  await choose();
  await act(async () => {
    current.setChosenTargets(["hatchling-0"]);
  });
  await act(async () => {
    current.setChosenTargets(["hatchling-2"]);
  });
  expect(sent.filter((m) => m.type === "castSpell")).toHaveLength(0);
  expect(current.canCast).toBe(true);
  await act(async () => current.cancelSpell());
  expect(current.canCast).toBe(false);
  await choose();
  await act(async () => current.setChosenTargets(["hatchling-1"]));
  await act(async () => {
    current.castSpell();
    current.castSpell();
  });
  const casts = sent.filter((m) => m.type === "castSpell");
  expect(casts).toHaveLength(1);
  expect(current.pending).toBe(true);
  expect(current.canCast).toBe(false);
  const cast = casts[0];
  if (cast.type !== "castSpell") throw new Error();
  castBattleSpell(bm, cast.data, "fixture-owner");
  expect(bm.getEntityById("hatchling-1")!.health).toBeLessThan(40);
  expect(bm.getEntityById("hatchling-2")!.health).toBe(40);
  await act(async () => {
    socket.receive({
      type: "castAccepted",
      data: { requestId: cast.data.requestId },
    });
    receiveState();
  });
  expect(current.canCast).toBe(false);
  expect(current.activeSpell).toBeNull();
});

test("old legal-target responses cannot enable a newer spell", async () => {
  await choose();
  const old = sent.find((m) => m.type === "getTargets")!;
  await act(async () => current.getTargets("hero-0-stone-bark"));
  if (old.type !== "getTargets") throw new Error();
  await act(async () =>
    socket.receive({ type: "targets", data: getBattleTargets(bm, old.data) }),
  );
  expect(current.validTargets).toBeNull();
  expect(current.canCast).toBe(false);
});

test("self and team sets are prepared automatically but wait for Cast", async () => {
  await choose("stone-bark");
  expect(current.chosenTargets).toEqual(["hero-0"]);
  expect(current.canCast).toBe(true);
  expect(sent.filter((m) => m.type === "castSpell")).toHaveLength(0);
  await choose("festering-blow");
  expect(current.chosenTargets).toEqual([
    "hatchling-0",
    "hatchling-1",
    "hatchling-2",
    "hatchling-3",
  ]);
  await act(async () => current.setChosenTargets(["hatchling-0"]));
  expect(current.chosenTargets).toHaveLength(4);
  expect(sent.filter((m) => m.type === "castSpell")).toHaveLength(0);
});

test("disconnect clears selection and pending commands; reconnect sends nothing automatically", async () => {
  await choose();
  await act(async () => current.setChosenTargets(["hatchling-0"]));
  await act(async () => {
    current.castSpell();
    socket.close();
  });
  expect(current.activeSpell).toBeNull();
  expect(current.canCast).toBe(false);
  const commandCount = sent.length;
  await act(async () => {
    socket.open();
    receiveState();
  });
  expect(sent).toHaveLength(commandCount);
  expect(current.activeSpell).toBeNull();
  expect(current.pending).toBe(false);
});

test("presentation switching retains one battle connection and spectators cannot prepare or cast", async () => {
  await act(async () => root.render(<Probe alternate />));
  expect(sockets).toHaveLength(1);
  expect(sent).toHaveLength(0);
  userId = "spectator";
  await act(async () => root.render(<Probe />));
  await act(async () => {
    current.getTargets("hero-0-cinder-wisp");
    current.castSpell();
  });
  expect(current.canChoose).toBe(false);
  expect(sent).toHaveLength(0);
});

test("a rejected cast clears pending state and permits a fresh choice on the unchanged turn", async () => {
  await choose();
  await act(async () => current.setChosenTargets(["hatchling-0"]));
  await act(async () => current.castSpell());
  const command = sent.find((m) => m.type === "castSpell")!;
  if (command.type !== "castSpell") throw new Error();
  await act(async () => {
    socket.receive({
      type: "rejected",
      data: { requestId: command.data.requestId, message: "Choose again" },
    });
    receiveState();
  });
  expect(current.pending).toBe(false);
  expect(current.canChoose).toBe(true);
  expect(current.error).toBe("Choose again");
});
