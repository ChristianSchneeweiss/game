import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ComponentProps } from "react";
import { encounter, snapshot } from "./encounter";
import SuperJSON from "superjson";
import { buildTimeline } from "../../apps/client/src/routes/battle/-presentation/timeline";

const browser = new Window({ url: "http://localhost:3001/battle/cards" });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  HTMLElement: browser.HTMLElement,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  NodeFilter: browser.NodeFilter,
  Node: browser.Node,
  Element: browser.Element,
  Event: browser.Event,
  CustomEvent: browser.CustomEvent,
  MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver,
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});
mock.module("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: "fixture-owner" } }),
}));
mock.module(
  "../../apps/client/src/routes/battle/-presentation/recorded-battle",
  () => ({
    default: ({ onFallback }: { onFallback: () => void }) => (
      <button onClick={onFallback}>Use Cards</button>
    ),
  }),
);
const { BattleRender } =
  await import("../../apps/client/src/routes/battle/-battle-render");
const { default: ResultReplay } =
  await import("../../apps/client/src/routes/battle/-result-replay");
let root: Root;
let container: HTMLDivElement;
let bm: ReturnType<typeof encounter>;
beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  bm = encounter();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
function props(): ComponentProps<typeof BattleRender> {
  return {
    participants: bm.startEntityData,
    stats: buildTimeline(
      bm.startEntityData,
      bm.events,
      undefined,
      bm.effectTracking,
    ).at(-1)!.stats,
    effectTracking: bm.effectTracking,
    battleState: {
      events: bm.events,
      effectTracking: bm.effectTracking,
      round: bm.getCurrentRound(),
      revision: bm.events.length,
      availableSpells: bm.startEntityData[0]!.spells.map(
        (spell) => spell.config.id,
      ),
    },
    mode: "live",
    isLive: true,
  };
}
function button(label: string) {
  const result = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  if (!result) throw new Error(`Missing button ${label}`);
  return result;
}

test("Cards exposes named spell controls and keeps keyboard focus across session updates", async () => {
  const requests: string[] = [];
  const initial = { ...props(), getTargets: (id: string) => requests.push(id) };
  await act(async () => root.render(<BattleRender {...initial} />));
  const prepare = button("Prepare Cinder Wisp");
  prepare.focus();
  await act(async () => prepare.click());
  expect(requests).toEqual(["hero-0-cinder-wisp"]);
  await act(async () =>
    root.render(<BattleRender {...initial} activeSpell="hero-0-cinder-wisp" />),
  );
  expect(button("Prepare Cinder Wisp")).toBe(prepare);
  expect(document.activeElement).toBe(prepare);
  expect(prepare.getAttribute("aria-pressed")).toBe("true");
  await act(async () => button("About Cinder Wisp").click());
  expect(requests).toHaveLength(1);
});

test("Cards disables preparation while disconnected or presenting replay", async () => {
  const requests: string[] = [];
  await act(async () =>
    root.render(
      <BattleRender
        {...props()}
        isLive={false}
        getTargets={(id) => requests.push(id)}
      />,
    ),
  );
  expect(button("Prepare Cinder Wisp").disabled).toBe(true);
  await act(async () => button("Prepare Cinder Wisp").click());
  expect(requests).toHaveLength(0);
});

test("Cards ownership uses saved participant data without requiring combat class instances", async () => {
  const participants = SuperJSON.parse<
    ComponentProps<typeof BattleRender>["participants"]
  >(SuperJSON.stringify(snapshot(bm.startEntityData)));
  await act(async () =>
    root.render(<BattleRender {...props()} participants={participants} />),
  );
  expect(button("Prepare Cinder Wisp").disabled).toBe(false);
});

test("Cards replay can return to the 3D presentation after fallback", async () => {
  await act(async () =>
    root.render(
      <ResultReplay
        data={{
          participants: bm.startEntityData,
          timelineData: bm.events,
          effectTracking: bm.effectTracking,
          startEntityData: [],
        }}
      />,
    ),
  );
  await act(async () =>
    container.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(
    container.querySelector('[aria-label="Battle replay in Cards"]'),
  ).not.toBeNull();
  const show3D = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === "3D battlefield",
  )!;
  await act(async () => show3D.click());
  expect(
    container.querySelector('[aria-label="Battle replay in Cards"]'),
  ).toBeNull();
  expect(container.textContent).toBe("Use Cards");
});
