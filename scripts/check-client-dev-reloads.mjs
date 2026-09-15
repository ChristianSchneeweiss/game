// Run with the main app and both preview servers running. Pass URLs to narrow it.
import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const urls = process.argv.slice(2);
if (!urls.length) {
  urls.push(
    "http://localhost:3001/characters",
    "http://127.0.0.1:3015/dev/sanctum.html#/characters",
    "http://127.0.0.1:3012/dev/fantasy-ui.html",
  );
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});

try {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const page = await browser.newPage();
      let documents = 0;
      let reloads = 0;
      let connected = false;
      page.on("request", (request) => {
        if (
          request.isNavigationRequest() &&
          request.frame() === page.mainFrame()
        )
          documents++;
      });
      page.on("websocket", (socket) => {
        socket.on("framereceived", ({ payload }) => {
          let message;
          try {
            message = JSON.parse(payload.toString());
          } catch {
            return;
          }
          if (message.type === "connected") connected = true;
          if (message.type === "full-reload") reloads++;
        });
      });
      try {
        await page.goto(url, { waitUntil: "commit", timeout: 15000 });
        await new Promise((resolve) => setTimeout(resolve, 20000));
        assert.ok(connected, `${url}: Vite HMR did not connect`);
        assert.equal(documents, 1, `${url}: unexpected document navigations`);
        assert.equal(reloads, 0, `${url}: unexpected Vite full reloads`);
        await page.locator("h1").first().waitFor({ timeout: 5000 });
        console.log(`PASS ${url}: one document load, no reloads in 20 seconds`);
      } finally {
        await page.close();
      }
    }),
  );
  for (const result of results) {
    if (result.status === "rejected") throw result.reason;
  }
} finally {
  await browser.close();
}
