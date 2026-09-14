import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, useState } from "react";
import type { Root } from "react-dom/client";
import {
  parseLibrarySearch,
  type LibrarySearch,
} from "../../../apps/client/src/features/library/library-search";
import { installLibraryAssessments } from "../support/library-fixtures";

const browser = new Window({ url: "http://localhost/library" });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  HTMLElement: browser.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const restore = installLibraryAssessments();
const { createRoot } = await import("react-dom/client");
const { LibraryPage } =
  await import("../../../apps/client/src/features/library/library-page");
let root: Root;
let container: HTMLElement;
let applied: LibrarySearch;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
afterAll(() => {
  restore();
  browser.happyDOM.abort();
});

function Harness({ initial }: { initial: LibrarySearch }) {
  const [search, setSearch] = useState(initial);
  applied = search;
  return <LibraryPage search={search} onSearchChange={setSearch} />;
}
async function mount(search: Record<string, unknown> = {}) {
  await act(async () =>
    root.render(<Harness initial={parseLibrarySearch(search)} />),
  );
}
function input(label: string) {
  const element = [...container.querySelectorAll("label")]
    .find((node) => node.querySelector("span")?.textContent === label)
    ?.querySelector("input");
  if (!element) throw new Error(`Missing input ${label}`);
  return element;
}
async function type(label: string, value: string) {
  const element = input(label);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      browser.HTMLInputElement.prototype,
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(
      new browser.Event("input", { bubbles: true }) as unknown as Event,
    );
  });
}
async function select(label: string, value: string) {
  const element = [...container.querySelectorAll("select")].find(
    (select) => select.getAttribute("aria-label") === label,
  )!;
  await act(async () => {
    element.value = value;
    element.dispatchEvent(
      new browser.Event("change", { bubbles: true }) as unknown as Event,
    );
  });
}
async function click(label: string) {
  const button = [...container.querySelectorAll("button")].find(
    (node) => node.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Missing button ${label}`);
  await act(async () => button.click());
}
function rows() {
  return [...container.querySelectorAll(".library-list tbody tr")];
}
function detail() {
  return container.querySelector('[aria-label="Entry details"]')!;
}

test("list and details agree for Assessed, Estimated, zero and Unrated, with readable families", async () => {
  await mount({ entry: "fireball" });
  expect(detail().querySelector(".library-might")?.textContent).toBe(
    "C · Might 190",
  );
  expect(
    rows()
      .find((row) => row.textContent?.includes("Fireball"))
      ?.querySelector(".library-might")?.textContent,
  ).toBe("C · Might 190");
  expect(detail().textContent).toContain("Legacy tier A");
  expect(detail().textContent).toContain("Comparison family: Spells");
  await click("Basic Attack");
  expect(detail().querySelector(".library-might")?.textContent).toBe(
    "E · Might 0",
  );
  await select("Sort entries", "mightDesc");
  const estimated = rows().find((row) =>
    row.textContent?.includes("Estimated"),
  )!;
  await act(async () => estimated.querySelector("button")!.click());
  expect(detail().querySelector(".library-might")?.textContent).toBe(
    "D · Might 189Estimated",
  );
  expect(detail().textContent).toContain("provisional assessment");
  await select("Filter by tier", "unrated");
  expect(detail().querySelector(".library-might")?.textContent).toBe(
    "Might —Unrated",
  );
  expect(detail().textContent).toContain("does not mean zero power");
  expect(rows().every((row) => row.textContent?.includes("Unrated"))).toBe(
    true,
  );
});

test("range edits apply valid values, preserve focus and retain the last valid range on errors", async () => {
  await mount();
  input("Minimum Might").focus();
  await type("Minimum Might", "189");
  expect(document.activeElement).toBe(input("Minimum Might"));
  await type("Maximum Might", "190");
  expect(applied).toMatchObject({ mightMin: 189, mightMax: 190 });
  expect(rows()).toHaveLength(2);
  await type("Minimum Might", "191");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "must not exceed",
  );
  expect(input("Minimum Might").getAttribute("aria-invalid")).toBe("true");
  expect(input("Minimum Might").getAttribute("aria-describedby")).toBe(
    container.querySelector('[role="alert"]')!.id,
  );
  expect(applied).toMatchObject({ mightMin: 189, mightMax: 190 });
  expect(rows()).toHaveLength(2);
  await type("Minimum Might", "-1");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "whole numbers",
  );
  expect(rows()).toHaveLength(2);
  await type("Minimum Might", "190");
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(rows()).toHaveLength(1);
  await type("Search library", "no matching content");
  expect(container.textContent).toContain("No matching entries");
  await click("Clear filters");
  expect(applied).toMatchObject({
    q: "",
    tier: "all",
    group: "all",
    mightMin: undefined,
    mightMax: undefined,
  });
  expect(input("Minimum Might").value).toBe("");
  expect(rows().length).toBeGreaterThan(3);
  await type("Maximum Might", "0");
  expect(rows()).toHaveLength(1);
  expect(detail().textContent).toContain("E · Might 0");
  await click("Clear range");
  expect(rows().length).toBeGreaterThan(3);
});

test("Might ordering labels item families and combines ranges with slot restrictions", async () => {
  await mount({ category: "items", group: "bogus", sort: "mightDesc" });
  expect(
    [...container.querySelectorAll(".library-list caption")].map(
      (node) => node.textContent,
    ),
  ).toEqual(["Armor · Might comparison", "Weapon · Might comparison"]);
  const tables = [...container.querySelectorAll(".library-list table")];
  expect(
    tables.every((table) =>
      table
        .querySelector("tbody tr:last-child")
        ?.textContent?.includes("Unrated"),
    ),
  ).toBe(true);
  await select("Sort entries", "mightAsc");
  await type("Minimum Might", "190");
  expect(rows()).toHaveLength(2);
  await select("Filter by type", "weapon");
  expect(rows()).toHaveLength(1);
  expect(detail().textContent).toContain("Comparison family: Weapon");
  await click("Clear filters");
  expect(rows()).toHaveLength(4);
  expect(container.querySelectorAll(".library-family-heading")).toHaveLength(2);
});

test("preview changes ordinary damage while keeping list/detail ratings and tier membership stable", async () => {
  await mount({
    q: "fireball",
    tier: "C",
    sort: "mightDesc",
    mightMin: 190,
    mightMax: 190,
  });
  const before = detail().querySelector(".library-description")!.textContent;
  await act(async () => {
    container.querySelector("details")!.open = true;
  });
  await type("intelligence", "100");
  expect(detail().querySelector(".library-description")!.textContent).not.toBe(
    before,
  );
  expect(rows()).toHaveLength(1);
  expect(detail().querySelector(".library-might")?.textContent).toBe(
    "C · Might 190",
  );
  expect(rows()[0].querySelector(".library-might")?.textContent).toBe(
    "C · Might 190",
  );
  expect(applied).toMatchObject({ tier: "C", mightMin: 190, mightMax: 190 });
});

test("category and related-entry navigation reset ordering, bounds and group restrictions", async () => {
  await mount({
    category: "items",
    sort: "mightDesc",
    mightMin: 190,
    group: "weapon",
  });
  const enemyButton = [...container.querySelectorAll("nav button")].find(
    (node) => node.textContent?.startsWith("Enemies"),
  )!;
  await act(async () => (enemyButton as HTMLButtonElement).click());
  expect(applied).toMatchObject({
    category: "enemies",
    sort: "name",
    mightMin: undefined,
    mightMax: undefined,
    group: "all",
    tier: "all",
  });
  await select("Filter by tier", "B");
  await select("Sort entries", "mightDesc");
  await type("Minimum Might", "263");
  expect(rows()).toHaveLength(1);
  expect(detail().textContent).toContain("Ashen Skeleton");
  const drop = [...detail().querySelectorAll(".library-reference")].find(
    (node) => node.textContent?.includes("Splinter Shot"),
  ) as HTMLButtonElement;
  expect(drop.querySelector(".library-might")?.textContent).toBe(
    "Might —Unrated",
  );
  await act(async () => drop.click());
  expect(applied).toMatchObject({
    category: "spells",
    entry: "splinter-shot",
    sort: "tier",
    tier: "all",
    group: "all",
    mightMin: undefined,
    mightMax: undefined,
  });
  expect(detail().querySelector(".library-might")?.textContent).toBe(
    "Might —Unrated",
  );
  expect(input("Minimum Might").value).toBe("");
});
