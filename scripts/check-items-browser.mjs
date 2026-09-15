// Run against the isolated sanctum preview; fixtures never enter production catalogs.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const base =
  process.env.SANCTUM_URL ?? "http://127.0.0.1:3015/dev/sanctum.html";
const output = process.env.ITEMS_OUTPUT ?? "/tmp/items-browser";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
const errors = [],
  checks = [];
const check = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
async function open(state = "items", route = "/items") {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}?state=${state}#${route}`);
  await page
    .getByRole("heading", { name: "The inventory", exact: true })
    .waitFor();
  return page;
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert(
    size.scroll <= size.width + 1,
    `${label} overflow: ${JSON.stringify(size)}`,
  );
}
try {
  const page = await open();
  await page
    .getByRole("button", {
      name: "Inspect Test Material, quantity 7",
      exact: true,
    })
    .waitFor();
  assert.equal(await page.locator(".inventory-row").count(), 5);
  await page.getByRole("tab", { name: /^All items/ }).focus();
  await page.keyboard.press("ArrowRight");
  await page.getByLabel("Equipment slot", { exact: true }).waitFor();
  assert.equal(await page.locator(".inventory-row").count(), 3);
  await page.keyboard.press("ArrowRight");
  await page
    .getByRole("tab", { name: /^Consumables/ })
    .and(page.locator('[aria-selected="true"]'))
    .waitFor();
  assert.equal(await page.locator(".inventory-row").count(), 1);
  assert.equal(
    await page.getByLabel("Equipment slot", { exact: true }).count(),
    0,
  );
  check(
    "kind filters support keyboard navigation and keep supplies out of gear controls",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const supply = page.getByRole("button", {
    name: "Inspect Test Supply, quantity 2",
    exact: true,
  });
  await supply.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Test Supply", exact: true });
  await dialog.waitFor();
  const supplyText = await dialog.innerText();
  assert(supplyText.includes("Consumable · Tier C"));
  assert(supplyText.includes("Quantity: 2"));
  assert(supplyText.includes("Battle (requires equipping)"));
  assert(supplyText.includes("Outside battle (from inventory)"));
  assert(
    !supplyText.includes("Might") && !supplyText.includes("Choose a character"),
  );
  assert.equal(
    await dialog.getByRole("button", { name: /^(Use|Equip)$/ }).count(),
    0,
  );
  await noOverflow(page, "mobile consumable");
  await page.screenshot({ path: path.join(output, "consumable-mobile.png") });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert(
    await supply.evaluate((element) => element === document.activeElement),
  );
  check(
    "mobile details expose quantity and use contexts; Escape restores the selected item",
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("tab", { name: /^Materials/ }).click();
  await page
    .getByRole("heading", { name: "Test Material", exact: true })
    .waitFor();
  const details = page.getByRole("complementary", { name: "Selected item" });
  assert((await details.innerText()).includes("Material · Tier B"));
  assert((await details.innerText()).includes("Quantity: 7"));
  assert(!(await details.innerText()).includes("Might"));
  await page.screenshot({
    path: path.join(output, "material-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("tab", { name: /^All items/ }).click();
  await page.getByLabel("Sort items", { exact: true }).selectOption("tier");
  assert(
    (await page.locator(".inventory-row").first().innerText()).includes(
      "Test Material",
    ),
  );
  await page
    .getByLabel("Search your items", { exact: true })
    .fill("no matching item");
  await page.getByRole("heading", { name: "No matching items" }).waitFor();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Inspect Test Material, quantity 7",
      exact: true,
    })
    .waitFor();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow(page, `inventory ${width}`);
  }
  check(
    "search, clear filters and tier sorting work; collection fits widths 320–1440",
  );

  await page
    .getByRole("button", {
      name: "Inspect Test Material, quantity 7",
      exact: true,
    })
    .click();
  await details.getByRole("link", { name: "View in Library" }).click();
  const libraryDetails = page.getByRole("complementary", {
    name: "Entry details",
  });
  await libraryDetails
    .getByRole("heading", { name: "Test Material", exact: true })
    .waitFor();
  assert.equal(
    await libraryDetails.locator(".library-might").innerText(),
    "Tier B",
  );
  assert(!(await libraryDetails.innerText()).includes("Might"));
  await page.locator(".library-advanced > summary").click();
  await page.getByLabel("Minimum Might", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Test Material", exact: true })
    .waitFor({ state: "hidden" });
  assert.equal(
    await page
      .getByRole("button", { name: "Test Supply", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Clear range", exact: true }).click();
  await page
    .getByRole("button", { name: "Test Material", exact: true })
    .waitFor();
  check(
    "inventory links to canonical Library details; numeric Might bounds exclude unassessed item kinds",
  );

  await page.getByRole("link", { name: /^\d+ Loot$/ }).click();
  await page.getByRole("button", { name: "Claim loot", exact: true }).waitFor();
  const reward = page
    .locator(".reward-entry")
    .filter({ hasText: "Test Material" });
  assert((await reward.innerText()).includes("Material · Tier B"));
  assert((await reward.innerText()).includes("×4"));
  await page.screenshot({
    path: path.join(output, "rewards-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Claim loot", exact: true }).click();
  await page.getByRole("heading", { name: "No loot waiting" }).waitFor();
  await page.getByRole("link", { name: /^Items/ }).click();
  await page
    .getByRole("button", {
      name: "Inspect Test Material, quantity 11",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Inspect Test Supply, quantity 5",
      exact: true,
    })
    .waitFor();
  assert.equal(await page.locator(".inventory-row").count(), 7);
  check(
    "reward quantities and tiers agree; successful claim refreshes the visible collection",
  );
  await page.close();

  for (const [state, message] of [
    ["empty", "The vault is empty"],
    ["error", "Could not load your inventory"],
    ["loading", "Opening your collection…"],
  ]) {
    const page = await open(state);
    await page.getByText(message, { exact: true }).waitFor();
    if (state === "error")
      assert(
        await page
          .getByRole("button", { name: "Retry", exact: true })
          .isEnabled(),
      );
    await page.setViewportSize({ width: 320, height: 844 });
    await noOverflow(page, state);
    await page.close();
    check(`${state} state is explicit and fits a narrow screen`);
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify({ checks, errors }, null, 2),
  );
  await browser.close();
}
