import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, useState, type ReactNode } from "react";
import type { Root } from "react-dom/client";
import { installItemFixtures } from "../support/item-fixtures";
import { database } from "../support/database";
import {
  grantItems,
  readInventory,
} from "../../../apps/server/src/game-usecases/inventory";
import type { LootEntity } from "../../../apps/game/src/types";
import { createItemLibrary } from "../../../apps/game/src/library/catalog";
import { parseLibrarySearch } from "../../../apps/client/src/features/library/library-search";

const browser = new Window({ url: "http://localhost/items" });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  location: browser.location,
  HTMLElement: browser.HTMLElement,
  Element: browser.Element,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});
const fixtures = installItemFixtures();
const data = await database();
await data.db.transaction((tx) =>
  grantItems(
    "audit-owner",
    [
      { type: fixtures.material.type, quantity: 7 },
      { type: fixtures.consumable.type, quantity: 2 },
      { type: "iron-sword", quantity: 2 },
    ],
    tx,
  ),
);
const inventory = await readInventory("audit-owner", data.db);
const { createRoot } = await import("react-dom/client");
const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } =
  await import("@tanstack/react-router");
const { OwnedInventory } =
  await import("../../../apps/client/src/features/armoury/owned-armoury");
const { LibraryPage } =
  await import("../../../apps/client/src/features/library/library-page");
const { LibraryDetail } =
  await import("../../../apps/client/src/features/library/library-entry");
const { RewardEntry } =
  await import("../../../apps/client/src/features/expedition/reward-entry");
const { groupDrops } =
  await import("../../../apps/client/src/features/expedition/run-info");
let root: Root;
let container: HTMLElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
afterAll(async () => {
  fixtures.restore();
  await data.close();
  browser.happyDOM.abort();
});

async function mount(node: ReactNode) {
  const route = createRootRoute({ component: () => node });
  const router = createRouter({
    routeTree: route,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    await router.load();
    root.render(<RouterProvider router={router} />);
  });
}
function detail() {
  return container.querySelector('[aria-label="Selected item"]')!;
}
async function inspect(name: string) {
  const row = container.querySelector<HTMLButtonElement>(
    `button[aria-label^="Inspect ${name},"]`,
  )!;
  await act(async () => row.click());
}
async function tab(name: string) {
  const element = [
    ...container.querySelectorAll<HTMLElement>('[role="tab"]'),
  ].find((tab) => tab.textContent?.startsWith(name))!;
  await act(async () =>
    element.dispatchEvent(
      new browser.MouseEvent("mousedown", {
        bubbles: true,
        button: 0,
      }) as unknown as Event,
    ),
  );
}

test("owned stacks show quantities and context details; kind filters exclude gear controls", async () => {
  await mount(<OwnedInventory items={inventory} loading={false} />);
  expect(container.querySelectorAll(".inventory-row")).toHaveLength(4);
  await inspect("Test Material");
  expect(detail().textContent).toContain("Material · Tier B");
  expect(detail().textContent).toContain("Quantity: 7");
  expect(detail().textContent).not.toContain("Might");
  expect(detail().textContent).not.toContain("Choose a character");
  expect(detail().querySelector('a[href*="library"]')).not.toBeNull();
  await tab("Consumables");
  expect(container.querySelectorAll(".inventory-row")).toHaveLength(1);
  expect(detail().textContent).toContain("Consumable · Tier C");
  expect(detail().textContent).toContain("Quantity: 2");
  expect(detail().textContent).toContain("Battle (requires equipping)");
  expect(detail().textContent).toContain("Outside battle (from inventory)");
  expect(detail().querySelectorAll("button")).toHaveLength(0);
  await tab("Equipment");
  expect(container.querySelectorAll(".inventory-row")).toHaveLength(2);
  expect(detail().textContent).toContain("Copy 1 of 2");
  expect(detail().textContent).toContain("Choose a character");
});

test("loading, empty and error states are distinct and failed reads offer retry", async () => {
  let retries = 0;
  await mount(
    <OwnedInventory
      items={[]}
      loading={false}
      error
      onRetry={() => retries++}
    />,
  );
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Could not load your inventory",
  );
  expect(container.textContent).not.toContain("The vault is empty");
  await act(async () =>
    container.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(retries).toBe(1);
});
test("empty inventory explains where to collect items", async () => {
  await mount(<OwnedInventory items={[]} loading={false} />);
  expect(container.textContent).toContain("The vault is empty");
  expect(container.querySelector('a[href="/dungeons"]')).not.toBeNull();
});
test("loading inventory does not report an empty collection", async () => {
  await mount(<OwnedInventory items={[]} loading />);
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  expect(container.textContent).not.toContain("The vault is empty");
});

function LibraryHarness() {
  const [search, setSearch] = useState(
    parseLibrarySearch({ category: "items", entry: fixtures.material.type }),
  );
  return <LibraryPage search={search} onSearchChange={setSearch} />;
}
test("Library list and details agree on assigned tiers; Unrated and numeric Might filters omit stackables", async () => {
  await mount(<LibraryHarness />);
  const detail = () => container.querySelector('[aria-label="Entry details"]')!;
  expect(detail().querySelector(".library-might")?.textContent).toBe("Tier B");
  expect(detail().textContent).not.toContain("Unrated");
  expect(detail().textContent).not.toContain("Might");
  const tier = [...container.querySelectorAll("select")].find(
    (node) => node.getAttribute("aria-label") === "Filter by tier",
  )!;
  await act(async () => {
    tier.value = "B";
    tier.dispatchEvent(
      new browser.Event("change", { bubbles: true }) as unknown as Event,
    );
  });
  expect(container.querySelector(".library-list")?.textContent).toContain(
    "Test Material",
  );
  await act(async () => {
    tier.value = "unrated";
    tier.dispatchEvent(
      new browser.Event("change", { bubbles: true }) as unknown as Event,
    );
  });
  expect(container.querySelector(".library-list")?.textContent).not.toContain(
    "Test Material",
  );
  expect(container.querySelector(".library-list")?.textContent).not.toContain(
    "Test Supply",
  );
});

test("reward summaries sum quantities and share inventory metadata; duplicate enemy references remain navigable", async () => {
  const rewards: LootEntity[] = [
    {
      type: "ITEM",
      dropRate: 0.25,
      data: { itemType: fixtures.material.type, quantity: 4 },
    },
    {
      type: "ITEM",
      dropRate: 0.25,
      data: { itemType: fixtures.material.type, quantity: 3 },
    },
    {
      type: "ITEM",
      dropRate: 1,
      data: { itemType: fixtures.consumable.type, quantity: 2 },
    },
  ];
  const drops = groupDrops(rewards);
  let inspected = "";
  const items = createItemLibrary();
  const source = {
    ...items[0]!,
    category: "enemies" as const,
    type: "test-source",
    name: "Test source",
    related: [],
    drops: rewards.map((reward, index) => ({
      id: `source:${index}`,
      category: "items" as const,
      type: reward.type === "ITEM" ? reward.data.itemType : "",
      chance: reward.dropRate,
      quantity: reward.type === "ITEM" ? reward.data.quantity : undefined,
    })),
  };
  await mount(
    <>
      <section aria-label="Rewards">
        {drops.map((drop) => (
          <RewardEntry key={drop.type} item={drop.item} count={drop.count} />
        ))}
      </section>
      <LibraryDetail
        entry={source}
        entries={[...items, source]}
        onInspect={(reference) => {
          inspected = reference.type;
        }}
      />
    </>,
  );
  const summaries = container.querySelector('[aria-label="Rewards"]')!;
  expect(summaries.textContent).toContain("Material · Tier BTest Material×7");
  expect(summaries.textContent).toContain("Consumable · Tier CTest Supply×2");
  const links = [
    ...container.querySelectorAll<HTMLButtonElement>(".library-reference"),
  ];
  expect(links).toHaveLength(3);
  expect(links[0]!.textContent).toContain("×4 · 25%");
  await act(async () => links[1]!.click());
  expect(inspected).toBe(fixtures.material.type);
});
