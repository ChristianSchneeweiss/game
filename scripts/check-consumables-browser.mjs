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
const output =
  process.env.CONSUMABLES_OUTPUT ?? "/tmp/loot-consumables-browser";
await mkdir(output, { recursive: true });
const errors = [];
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(`${base}?state=consumables#/items`);
  await page
    .getByRole("button", {
      name: "Inspect Healing Potion, quantity 3",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Use Healing Potion (+40 health)",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Inspect Healing Potion, quantity 2",
      exact: true,
    })
    .waitFor();
  assert(
    (
      await page
        .getByRole("complementary", { name: "Selected item" })
        .innerText()
    ).includes("110/420 health"),
  );
  console.log("PASS inventory use updates resources and stock");
  await page.screenshot({
    path: `${output}/inventory-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", {
      name: "Inspect Mana Potion, quantity 2",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", { name: "Mana Potion", exact: true });
  await dialog
    .getByRole("button", { name: "Use Mana Potion (+25 mana)", exact: true })
    .click();
  await dialog.getByText("Quantity: 1", { exact: true }).waitFor();
  assert((await dialog.innerText()).includes("40/140 mana"));
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({
    path: `${output}/inventory-mobile.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  console.log("PASS mobile inventory use and layout");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}?state=consumables#/characters/hero`);
  await page.getByRole("tab", { name: "Equipment", exact: true }).click();
  await page
    .getByLabel("Consumable slot 1", { exact: true })
    .selectOption("healing-potion");
  await page
    .getByLabel("Consumable slot 2", { exact: true })
    .selectOption("mana-potion");
  await page.waitForFunction(
    () =>
      document.querySelector('select[aria-label="Consumable slot 2"]')
        ?.value === "mana-potion",
  );
  assert.equal(
    await page.getByLabel("Consumable slot 1", { exact: true }).inputValue(),
    "healing-potion",
  );
  assert.equal(
    await page.getByLabel("Consumable slot 2", { exact: true }).inputValue(),
    "mana-potion",
  );
  await page.screenshot({
    path: `${output}/loadout-desktop.png`,
    fullPage: true,
  });
  console.log("PASS two separate consumable slots");
  await page.goto(`${base}?state=consumables#/battle/live`);
  const potion = page
    .getByRole("button", { name: /Healing Potion ×1/ })
    .first();
  await potion.waitFor();
  const useCount = () =>
    page.evaluate(
      () =>
        window.sanctumPreview.commands.filter(
          (command) =>
            command.path === "useConsumable" && command.input.activationId,
        ).length,
    );
  const beforeUse = await useCount();
  await potion.click();
  await potion.waitFor({ state: "hidden" });
  await page.screenshot({
    path: `${output}/battle-after-use.png`,
    fullPage: true,
  });
  assert.equal(await potion.count(), 0);
  assert.equal(await useCount(), beforeUse + 1);
  console.log(
    "PASS battle drinking advances the activation and sends one command",
  );
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.reload();
    const mobilePotion = page
      .getByRole("button", { name: /Healing Potion ×1/ })
      .first();
    await mobilePotion.waitFor();
    await mobilePotion.click({ trial: true });
    await page
      .getByRole("button", { name: "End Turn", exact: true })
      .click({ trial: true });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: `${output}/battle-mobile-${width}.png`,
      fullPage: true,
    });
    await mobilePotion.click();
    await mobilePotion.waitFor({ state: "hidden" });
    console.log(`PASS mobile battle drinking at ${width}px`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
