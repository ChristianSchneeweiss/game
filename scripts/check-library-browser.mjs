import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
const base =
  process.env.SANCTUM_URL ?? "http://127.0.0.1:3147/dev/sanctum.html";
const output = process.env.LIBRARY_OUTPUT ?? "/tmp/loot-library-browser";
await mkdir(output, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const tab = (name) =>
  page
    .getByRole("navigation", { name: "Library categories" })
    .getByRole("button", { name: new RegExp(`^${name}`) });
const rows = () => page.locator(".library-list tbody tr");
try {
  await page.goto(`${base}#/library?category=items&entry=sovereign-signet`);
  await page
    .getByRole("heading", { name: "Sovereign Signet", exact: true })
    .waitFor();
  assert.equal(await tab("Equipment").getAttribute("aria-pressed"), "true");
  assert.equal(await rows().count(), 61);
  assert.equal(
    await page
      .getByRole("button", { name: "More options", exact: true })
      .getAttribute("aria-expanded"),
    "false",
  );
  const toolbarHeight = await page.evaluate(
    () =>
      document.querySelector(".library-content").getBoundingClientRect().top -
      document.querySelector(".library-browser").getBoundingClientRect().top,
  );
  assert(toolbarHeight < 120, `Toolbar takes ${toolbarHeight}px`);
  await page.screenshot({
    path: `${output}/equipment-desktop.png`,
    fullPage: true,
  });
  await page
    .getByLabel("Filter by type", { exact: true })
    .selectOption("boots");
  await page.getByLabel("Filter by tier", { exact: true }).selectOption("S");
  assert.equal(await rows().count(), 1);
  assert((await rows().innerText()).includes("Horizon Walkers"));
  console.log("PASS equipment tab, legacy link and compact filters");

  await tab("Items").click();
  assert.equal(await rows().count(), 5);
  assert.equal(
    await page.getByRole("button", { name: /More options/ }).count(),
    0,
  );
  assert.equal(
    await page.getByLabel("Sort entries", { exact: true }).inputValue(),
    "name",
  );
  await page
    .getByRole("button", { name: "Healing Potion", exact: true })
    .click();
  await page.screenshot({
    path: `${output}/items-desktop.png`,
    fullPage: true,
  });
  const details = page.getByRole("complementary", { name: "Entry details" });
  await details.getByRole("button", { name: /^Goblin/ }).click();
  assert.equal(await tab("Enemies").getAttribute("aria-pressed"), "true");
  await details.getByRole("button", { name: /^Copper Band/ }).click();
  assert.equal(await tab("Equipment").getAttribute("aria-pressed"), "true");
  await page
    .getByRole("heading", { name: "Copper Band", exact: true })
    .waitFor();
  console.log("PASS item separation and cross-tab drop navigation");

  await tab("Spells").click();
  await page.getByRole("button", { name: "More options", exact: true }).click();
  await page.getByLabel("Minimum Might", { exact: true }).fill("100");
  await page
    .getByRole("button", {
      name: "More options, Might range active",
      exact: true,
    })
    .click();
  assert.equal(
    await page.getByLabel("Minimum Might", { exact: true }).isVisible(),
    false,
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  console.log("PASS optional Might controls remain usable");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await tab("Items").click();
    await page
      .getByLabel("Filter by type", { exact: true })
      .selectOption("consumable");
    assert.equal(await rows().count(), 2);
    await page
      .getByRole("searchbox", { name: "Search library", exact: true })
      .fill("mana");
    assert.equal(await rows().count(), 1);
    await page
      .getByRole("button", { name: "Mana Potion", exact: true })
      .click();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: `${output}/items-mobile-${width}.png`,
      fullPage: true,
    });
    await tab("Equipment").click();
    await page
      .getByLabel("Filter by type", { exact: true })
      .selectOption("ring");
    assert.equal(await rows().count(), 6);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    console.log(`PASS mobile tabs and filtering at ${width}px`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
