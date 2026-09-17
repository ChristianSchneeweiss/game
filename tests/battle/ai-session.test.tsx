import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import SuperJSON from "superjson";
import type {
  BattleMessage,
  BattleState,
  ResponseMessage,
} from "../../apps/server/src/battle/protocol";
import { MANUAL_CONTROL } from "../../apps/game/src/ai-control";
import { encounter, snapshot } from "./encounter";

const browser = new Window({ url: "http://localhost:3001/battle/ai" });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  location: browser.location,
  HTMLElement: browser.HTMLElement,
  HTMLInputElement: browser.HTMLInputElement,
  Node: browser.Node,
  NodeFilter: browser.NodeFilter,
  CustomEvent: browser.CustomEvent,
  MutationObserver: browser.MutationObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});
let userId = "fixture-owner";
mock.module("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: userId } }),
}));
let socket: Socket;
let sent: BattleMessage[];
class Socket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  static CLOSING = 2;
  readyState = 0;
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (event: { data: string }) => void;
  constructor() {
    socket = this;
  }
  send(raw: string) {
    sent.push(SuperJSON.parse(raw));
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
const { BattleAiControls } =
  await import("../../apps/client/src/routes/battle/-components/battle-ai-controls");
let current: ReturnType<typeof useBattle>;
let root: Root;
let state: BattleState;
function Probe() {
  current = useBattle("ai");
  return <BattleAiControls session={current} />;
}
function button(label: string) {
  return [...document.querySelectorAll("button")].find(
    (element) => element.textContent?.trim() === label,
  )!;
}
beforeEach(async () => {
  userId = "fixture-owner";
  sent = [];
  const battle = encounter();
  state = {
    events: battle.events,
    effectTracking: battle.effectTracking,
    round: battle.getCurrentRound(),
    revision: battle.events.length,
    availableSpells: [],
    ai: {
      version: 0,
      choosing: "hero-0",
      controls: [
        {
          entityId: "hero-0",
          enabled: true,
          settings: {
            ...MANUAL_CONTROL,
            enabled: true,
            prompt: "Private strategy",
          },
        },
      ],
    },
  };
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Probe />));
  await act(async () => {
    socket.open();
    socket.receive({
      type: "entities",
      data: { entities: snapshot(battle.startEntityData) as never },
    });
    socket.receive({ type: "state", data: state });
  });
});
async function openSettings() {
  await act(async () =>
    document.querySelector<HTMLButtonElement>(".battle-ai-trigger")!.click(),
  );
}
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = "";
});

test("takeover remains usable during model wait; failures survive reconnect without resending controls", async () => {
  expect(document.querySelector("textarea")).toBeNull();
  expect(button("Take over").disabled).toBe(false);
  await act(async () => button("Take over").click());
  const command = sent.find((message) => message.type === "setAiControl")!;
  expect(command.data.settings.enabled).toBe(false);
  expect(button("Take over").disabled).toBe(true);
  state.ai = {
    version: 1,
    controls: [
      {
        entityId: "hero-0",
        enabled: false,
        settings: MANUAL_CONTROL,
        failure:
          "Commander took longer than five seconds. Manual control has resumed.",
      },
    ],
  };
  await act(async () => {
    socket.close();
    socket.open();
  });
  expect(current.ai.canEdit).toBe(false);
  await act(async () => socket.receive({ type: "state", data: state }));
  expect(current.ai.canEdit).toBe(true);
  expect(document.querySelector('[role="alert"]')!.textContent).toContain(
    "Manual control has resumed",
  );
  expect(sent).toHaveLength(1);
});

test("delayed control snapshots cannot restore stale prompts at the same combat revision", async () => {
  const old = structuredClone(state.ai);
  state.ai = {
    version: 2,
    controls: [
      { entityId: "hero-0", enabled: false, settings: MANUAL_CONTROL },
    ],
  };
  await act(async () => socket.receive({ type: "state", data: state }));
  await act(async () =>
    socket.receive({ type: "state", data: { ...state, ai: old } }),
  );
  expect(current.battleState!.ai!.version).toBe(2);
  await openSettings();
  expect(document.querySelector("textarea")!.value).toBe("");
  expect(button("Manual").getAttribute("aria-pressed")).toBe("true");
});

test("switching accounts removes private controls and does not submit changes", async () => {
  await openSettings();
  expect(document.querySelector("textarea")!.value).toBe("Private strategy");
  userId = "someone-else";
  await act(async () => root.render(<Probe />));
  expect(document.querySelector("textarea")).toBeNull();
  expect(document.querySelector("button")).toBeNull();
  expect(sent).toHaveLength(0);
});

test("the compact panel can change another owned character before their turn", async () => {
  state.ai!.controls.push({
    entityId: "hero-1",
    enabled: false,
    settings: MANUAL_CONTROL,
  });
  await act(async () => socket.receive({ type: "state", data: state }));
  expect(document.querySelector("textarea")).toBeNull();
  await openSettings();
  const controls = document.querySelector('[aria-label="Control for Seren"]')!;
  await act(async () => controls.querySelectorAll("button")[1]!.click());
  const command = sent.find((message) => message.type === "setAiControl")!;
  expect(command.data.entityId).toBe("hero-1");
  expect(command.data.settings.enabled).toBe(true);
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(sent).toHaveLength(1);
});
