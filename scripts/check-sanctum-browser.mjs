// Run against `bun run dev:sanctum`. See docs/features/obsidian-sanctum.md.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const base =
  process.env.SANCTUM_URL ?? "http://127.0.0.1:3015/dev/sanctum.html";
const output = process.env.SANCTUM_OUTPUT ?? "/tmp/sanctum-browser";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [],
  checks = [];
const check = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
async function open(route = "/", query = "") {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => errors.push(`${route}: ${error.message}`));
  await page.goto(`${base}${query ? `?${query}` : ""}#${route}`);
  await page.getByRole("button", { name: "Toggle Sidebar" }).waitFor();
  await page.waitForFunction(
    () => !document.body.innerText.includes("Loading…"),
  );
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function layout(page, label, widths = [320, 390, 768, 1024, 1440]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForFunction((width) => innerWidth === width, width);
    const measured = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(
      measured.scroll <= measured.width + 1,
      `${label} overflows at ${width}: ${measured.scroll}`,
    );
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: path.join(output, `${label}-${width}.png`),
        animations: "disabled",
      });
  }
  check(`${label}: no page overflow`);
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
  for (const route of process.env.SANCTUM_FLOWS_ONLY ||
  process.env.SANCTUM_STATES_ONLY
    ? []
    : [
        "/",
        "/characters",
        "/characters/hero",
        "/spells",
        "/items",
        "/loot",
        "/library",
        "/dungeons",
        "/dungeons/prepare",
        "/dungeons/company/company",
        "/dungeons/run",
        "/friends",
        "/invitations",
        "/battle/finished/result",
        "/battle/live",
      ]) {
    const page = await open(route);
    if (route === "/battle/live")
      await page
        .getByRole("button", { name: "End Turn", exact: true })
        .waitFor();
    await layout(page, route.replaceAll("/", "-") || "home");
    assert.equal(
      await page.getByText("Something went wrong", { exact: false }).count(),
      0,
      route,
    );
    await page.close();
  }
  if (!process.env.SANCTUM_STATES_ONLY) {
    {
      const page = await open("/", "account=signed-out");
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .last()
        .click();
      await page.getByRole("dialog", { name: "Account entry" }).waitFor();
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 390, height: 844 });
      const toggle = page.getByRole("button", { name: "Toggle Sidebar" });
      await toggle.click();
      const nav = page.getByRole("dialog", { name: "Game navigation" });
      await nav.waitFor();
      await page.keyboard.press("Escape");
      assert.ok(
        await toggle.evaluate((element) => element === document.activeElement),
      );
      await toggle.click();
      await nav.getByRole("link", { name: "Library", exact: true }).click();
      await page
        .getByRole("heading", { name: "Library", exact: true })
        .waitFor();
      assert.equal(await nav.count(), 0);
      await page.goBack();
      await page
        .getByRole("heading", { name: "Welcome to the Sanctum.", exact: true })
        .waitFor();
      check(
        "signed-out account entry, mobile navigation, Escape focus restoration and browser back",
      );
      await page.close();
    }
    {
      const page = await open("/characters/hero");
      const rename = page.getByRole("button", {
        name: "Rename Mira",
        exact: true,
      });
      await rename.click();
      const dialog = page.getByRole("dialog", { name: "Rename Character" });
      const input = dialog.getByRole("textbox", { name: "Character Name" });
      await input.fill("Mira of the North");
      await dialog.getByRole("button", { name: "Rename", exact: true }).click();
      assert.ok(
        await dialog
          .getByRole("button", { name: "Renaming...", exact: true })
          .isDisabled(),
      );
      await page
        .getByRole("heading", { name: "Mira of the North", exact: true })
        .first()
        .waitFor();
      assert.equal(await commandCount(page, "character.renameCharacter"), 1);
      await page
        .getByRole("button", { name: "Increase intelligence", exact: true })
        .click();
      await page.getByRole("button", { name: "Apply stat changes" }).click();
      await page.getByText("Applied stat changes.", { exact: true }).waitFor();
      assert.equal(await commandCount(page, "character.applyStatIncrease"), 1);
      const stats = page.getByRole("tab", { name: "Stats", exact: true });
      await stats.focus();
      await page.keyboard.press("ArrowRight");
      await page
        .getByRole("heading", { name: "Available spells", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Equip storm pulse", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Unequip Storm Pulse", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Unequip Storm Pulse", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Unequip Storm Pulse", exact: true })
        .waitFor({ state: "detached" });
      await page.getByRole("tab", { name: "Equipment", exact: true }).click();
      await page
        .getByRole("button", { name: "Equip Iron Sword", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Unequip Iron Sword", exact: true })
        .waitFor();
      check(
        "character rename, pending protection, attributes, keyboard tabs and equip/unequip",
      );
      await page.close();
    }
    {
      const page = await open("/loot");
      await page
        .getByRole("button", { name: "Claim loot", exact: true })
        .click();
      assert.ok(
        await page
          .getByRole("button", { name: "Claiming...", exact: true })
          .isDisabled(),
      );
      await page.getByRole("heading", { name: "No loot waiting" }).waitFor();
      assert.equal(await commandCount(page, "claimLoot"), 1);
      check("loot claim updates visible inventory without duplicate requests");
      await page.close();
    }
    {
      const page = await open("/friends");
      await page.getByRole("button", { name: "Accept", exact: true }).click();
      await page.getByText("No requests waiting.", { exact: true }).waitFor();
      await page.getByLabel("Enter their friend code").fill("SANCTUM-123");
      await page
        .getByRole("button", { name: "Find player", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Send friend request", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Request sent", exact: true })
        .waitFor();
      check("friend acceptance, lookup and request feedback");
      await page.close();
      const inbox = await open("/invitations");
      await inbox.getByRole("button", { name: "Accept invitation" }).click();
      await inbox
        .getByRole("heading", { name: "Choose your adventurer" })
        .waitFor();
      assert.equal(await commandCount(inbox, "social.respondInvitation"), 1);
      check(
        "invitation requires explicit acceptance and navigates to preparation",
      );
      await inbox.close();
    }
    for (const account of ["owner", "guest"]) {
      const page = await open(
        "/dungeons/company/company",
        `account=${account}`,
      );
      await page
        .getByRole("button", { name: "I'm ready", exact: true })
        .waitFor();
      if (account === "owner")
        assert.ok(
          await page
            .getByRole("button", { name: "Start encounter together →" })
            .isDisabled(),
        );
      else {
        assert.equal(
          await page
            .getByRole("button", { name: "Start encounter together →" })
            .count(),
          0,
        );
        assert.equal(await page.getByLabel("Host's dungeon choice").count(), 0);
      }
      await page
        .getByRole("button", { name: "I'm ready", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Not ready", exact: true })
        .waitFor();
      assert.equal(await commandCount(page, "preparation.ready"), 1);
      check(`${account}: fresh readiness and host-only encounter controls`);
      await page.close();
    }
    {
      const page = await open("/battle/live");
      const spell = page.getByRole("button", { name: /^Fireball/ });
      await spell.click();
      await page
        .getByText("Tile controls and threat preview", { exact: true })
        .click();
      await page.getByRole("button", { name: /^Tile 3, 3: Goblin/ }).click();
      assert.equal(await commandCount(page, "castSpatial"), 0);
      const cast = page.getByRole("button", { name: "Cast", exact: true });
      assert.ok(await cast.isEnabled());
      await cast.click();
      await page.waitForFunction(() =>
        window.sanctumPreview.commands.some(
          (command) => command.path === "castSpatial",
        ),
      );
      assert.equal(await commandCount(page, "castSpatial"), 1);
      check("spell and target selection prepare the action; only Cast commits");
      await page.close();
      const replay = await open("/battle/finished/result");
      await replay
        .getByRole("button", { name: "Watch battle replay ↓" })
        .click();
      await replay
        .getByRole("button", { name: "Cards", exact: true })
        .waitFor();
      assert.equal(
        await replay.getByRole("button", { name: "Cast", exact: true }).count(),
        0,
      );
      assert.equal(await commandCount(replay, "castSpatial"), 0);
      check("recorded replay exposes no live Cast action");
      await layout(replay, "replay", [390, 1440]);
      await replay.close();
    }
  }
  for (const [route, query, text] of [
    ["/characters", "state=empty", "Your roster is empty"],
    ["/loot", "state=empty", "No loot waiting"],
    ["/library?q=notarealspell", "", "No matching entries"],
    ["/characters/hero", "state=error", "Could not load this character"],
    ["/dungeons/company/company", "state=error", "Preparation unavailable"],
    [
      "/dungeons/company/company",
      "state=reconnecting",
      "Connecting to this expedition",
    ],
    ["/dungeons/company/company", "state=closed", "This preparation is closed"],
    ["/characters/hero", "state=long", "Seraphina"],
  ]) {
    const page = await open(route, query);
    if (text) await page.getByText(text, { exact: false }).first().waitFor();
    await layout(
      page,
      `${route.replaceAll("/", "-").split("?")[0]}-${query}`,
      [320, 390, 1440],
    );
    await page.close();
  }
  {
    const page = await open("/characters/hero", "state=mutation-error");
    await page.getByRole("button", { name: "Rename Mira" }).click();
    const dialog = page.getByRole("dialog", { name: "Rename Character" });
    await dialog.getByLabel("Character Name").fill("Mira the Wise");
    await dialog.getByRole("button", { name: "Rename", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(
      await dialog.getByLabel("Character Name").getAttribute("aria-invalid"),
      "true",
    );
    assert.ok(
      await dialog
        .getByRole("button", { name: "Rename", exact: true })
        .isEnabled(),
    );
    await page.keyboard.press("Escape");
    check("failed rename announces the error and permits recovery");
    await page.close();
  }
  {
    const page = await browser.newPage();
    await page.goto(`${base}?state=loading#/dungeons/company/company`);
    await page
      .getByRole("status")
      .filter({ hasText: "Loading shared preparation" })
      .waitFor();
    await page.close();
    const assets = await browser.newPage();
    await assets.route("**/art/**", (route) => route.abort());
    await assets.route("https://fonts.googleapis.com/**", (route) =>
      route.abort(),
    );
    await assets.goto(`${base}#/`);
    await assets
      .getByRole("link", { name: "Explore dungeons", exact: true })
      .click();
    await assets.waitForFunction(() => location.hash.startsWith("#/dungeons"));
    check(
      "loading state is announced; missing decoration does not block navigation",
    );
    await assets.close();
  }
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    await page.goto(`${base}?view=components`);
    const trigger = page.getByRole("button", {
      name: "Open dialog",
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Rename character" });
    await dialog.waitFor();
    for (let index = 0; index < 6; index++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      );
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.textContent === "Open dialog",
    );
    assert.ok(
      await trigger.evaluate((element) => element === document.activeElement),
    );
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Inspect character" }).waitFor();
    await page.keyboard.press("Escape");
    await layout(page, "components", [390, 1440]);
    check(
      "dialog focus containment, Escape restoration and menu keyboard access",
    );
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify({ checks, errors }, null, 2),
  );
  await browser.close();
}
