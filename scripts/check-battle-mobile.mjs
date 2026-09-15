// Run against `bun run dev:sanctum`; uses production routes and local combat.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const base =
  process.env.SANCTUM_URL ?? "http://127.0.0.1:3015/dev/sanctum.html";
const output = process.env.BATTLE_OUTPUT ?? "/tmp/battle-mobile";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});

async function open() {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.goto(`${base}?state=battle-mobile#/battle/live`);
  await page.getByRole("button", { name: "End Turn", exact: true }).waitFor();
  return page;
}

async function readableSpells(page, mode, width, height) {
  await page.setViewportSize({ width, height });
  if (mode === "3d") {
    await page.waitForFunction(() => {
      const labels = [...document.querySelectorAll("[data-entity-label]")];
      const canvas = document.querySelector("canvas");
      const field = document.querySelector(".battle-viewport");
      return (
        labels.length === 4 &&
        labels.every((label) => label.style.transform) &&
        canvas?.clientHeight === field?.clientHeight &&
        performance.getEntriesByName("battle-model-ready").length > 0
      );
    });
  }
  const list = page.locator('[aria-label="Choose a spell"]');
  assert.equal(await list.getByRole("button").count(), 5);
  const sizes = await list.getByRole("button").evaluateAll((buttons) =>
    buttons.map((button) => ({
      name: button.innerText,
      width: button.clientWidth,
      height: button.clientHeight,
      textWidth: button.querySelector(".battle-spell-text").clientWidth,
    })),
  );
  assert.ok(
    sizes.every(
      (size) => size.width >= 140 && size.textWidth >= 80 && size.height <= 120,
    ),
    `${mode} at ${width}×${height}: unreadable spells ${JSON.stringify(sizes)}`,
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `${mode} overflows the page at ${width}×${height}`,
  );
  await page.screenshot({
    path: path.join(output, `${mode}-${width}-${height}.png`),
    fullPage: true,
  });
  console.log(`PASS ${mode} readable spells at ${width}×${height}`);
}

async function commandCount(page, name) {
  return page.evaluate(
    (name) =>
      window.sanctumPreview.commands.filter((command) => command.path === name)
        .length,
    name,
  );
}

try {
  const page = await open();
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  const sizes = [
    [390, 844],
    [320, 740],
    [768, 1024],
    [844, 390],
    [1440, 1000],
  ];
  for (const [width, height] of sizes)
    await readableSpells(page, "cards", width, height);
  await page
    .getByRole("button", { name: "3D battlefield", exact: true })
    .click();
  for (const [width, height] of sizes) {
    await readableSpells(page, "3d", width, height);
    const canvas = page.locator("canvas");
    await canvas.waitFor();
    assert.ok(
      (await canvas.boundingBox()).height >= 280,
      `3D board crushed at ${width}×${height}`,
    );
    const labels = await page
      .locator("[data-entity-label]")
      .evaluateAll((labels) =>
        labels.map((label) => {
          const { left, right, top, bottom } = label.getBoundingClientRect();
          return { left, right, top, bottom };
        }),
      );
    for (let i = 0; i < labels.length; i++) {
      for (const other of labels.slice(i + 1)) {
        const label = labels[i];
        assert.ok(
          label.right <= other.left ||
            other.right <= label.left ||
            label.bottom <= other.top ||
            other.bottom <= label.top,
          `Overlapping 3D labels at ${width}×${height}`,
        );
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Inspect Deshaun27", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Entity inspector", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  for (const [width, height] of [
    [320, 740],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page
      .getByRole("button", { name: "Open battle chat", exact: true })
      .click();
    const bounds = await page.locator("[data-battle-chat-panel]").boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= width &&
        bounds.y + bounds.height <= height,
      `Chat clipped at ${width}×${height}`,
    );
    await page
      .getByRole("button", { name: "Close battle chat", exact: true })
      .click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const spell = page
    .locator('[aria-label="Choose a spell"]')
    .getByRole("button", { name: /^Arcane Channeling/ });
  await spell.click();
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  assert.equal(
    await page
      .locator('[aria-label="Choose a spell"]')
      .getByRole("button", { name: /^Arcane Channeling/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await commandCount(page, "castSpatial"),
    0,
    "Switching views must not commit a spell",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: /^Tile 3, 5: empty; reachable/ })
    .click();
  assert.equal(await commandCount(page, "move"), 0);
  await page.getByRole("button", { name: /^Move(?:\s|$)/ }).click();
  await page.waitForFunction(() =>
    window.sanctumPreview.commands.some((command) => command.path === "move"),
  );
  assert.equal(await commandCount(page, "move"), 1);
  console.log("PASS mobile movement and view-switch selection preservation");
  await page.close();

  const recovery = await open();
  await recovery.waitForFunction(
    () => document.querySelector("[data-entity-label]")?.style.transform,
  );
  await recovery
    .locator("canvas")
    .evaluate((canvas) =>
      canvas
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext(),
    );
  await recovery
    .getByRole("heading", { name: "Graphics unavailable" })
    .waitFor();
  await recovery.getByRole("button", { name: "Continue with Cards" }).click();
  await recovery
    .locator('[aria-label="Choose a spell"]')
    .getByRole("button", { name: /^Arcane Channeling/ })
    .click();
  await recovery.waitForFunction(
    () => !document.querySelector(".battle-cast-button")?.disabled,
  );
  assert.equal(await commandCount(recovery, "castSpatial"), 0);
  await recovery.getByRole("button", { name: "Cast", exact: true }).click();
  await recovery.waitForFunction(() =>
    window.sanctumPreview.commands.some(
      (command) => command.path === "castSpatial",
    ),
  );
  assert.equal(await commandCount(recovery, "castSpatial"), 1);
  console.log(
    "PASS WebGL context loss recovers to playable Cards; Cast commits once",
  );
  await recovery.close();
} finally {
  await browser.close();
}
