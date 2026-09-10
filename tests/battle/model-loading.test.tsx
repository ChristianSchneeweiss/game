import { afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { Mesh } from "three";
import { useMiniatureAssets } from "../../apps/client/src/routes/battle/-presentation/miniature";

const bytes = readFileSync(
  new URL(
    "../../apps/client/public/models/enemies-v1/Water_Elemental.glb",
    import.meta.url,
  ),
);
const realFetch = globalThis.fetch;
const realTimeout = globalThis.setTimeout;
const realClear = globalThis.clearTimeout;
let roots: Root[];
let requests: Map<
  string,
  { resolve: (response: Response) => void; count: number }
>;
let evictions: Map<number, () => void>;
let sequence = 0;
let results: Record<string, ReturnType<typeof useMiniatureAssets>>;

function Probe({ id, urls }: { id: string; urls: string[] }) {
  results[id] = useMiniatureAssets(urls);
  return null;
}
beforeEach(() => {
  const browser = new Window();
  Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  roots = [];
  requests = new Map();
  evictions = new Map();
  results = {};
  globalThis.fetch = ((url: string) =>
    new Promise<Response>((resolve) => {
      requests.set(url, {
        resolve,
        count: (requests.get(url)?.count ?? 0) + 1,
      });
    })) as typeof fetch;
  globalThis.setTimeout = ((
    callback: () => void,
    delay?: number,
    ...args: unknown[]
  ) => {
    if (delay !== 1000) return realTimeout(callback, delay, ...args);
    const id = ++sequence;
    evictions.set(id, callback);
    return id;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: number) => {
    if (!evictions.delete(id)) realClear(id);
  }) as typeof clearTimeout;
});
async function evict() {
  await act(async () => {
    const callbacks = [...evictions.values()];
    evictions.clear();
    callbacks.forEach((callback) => callback());
  });
}
afterEach(async () => {
  for (const root of roots) await act(async () => root.unmount());
  await evict();
  globalThis.fetch = realFetch;
  globalThis.setTimeout = realTimeout;
  globalThis.clearTimeout = realClear;
});
async function render(id: string, urls: string[]) {
  const root = createRoot(document.createElement("div"));
  roots.push(root);
  await act(async () => root.render(<Probe id={id} urls={urls} />));
  return root;
}
async function finish(url: string, status = 200) {
  await act(async () =>
    requests.get(url)!.resolve(new Response(bytes, { status })),
  );
}

test("duplicate models share a load and stay usable until the final scene releases them", async () => {
  const url = "/ownership-model.glb";
  const first = await render("first", [url, url]);
  await render("second", [url]);
  expect(requests.get(url)?.count).toBe(1);
  await finish(url);
  const asset = results.first.get(url)!.asset!;
  expect(asset).toBeDefined();
  expect(results.second.get(url)!.asset).toBe(asset);
  let disposed = 0;
  asset.scene.traverse((node) => {
    if (node instanceof Mesh)
      node.geometry.addEventListener("dispose", () => disposed++);
  });
  await act(async () => first.unmount());
  roots = roots.filter((root) => root !== first);
  await evict();
  expect(disposed).toBe(0);
  const last = roots.pop()!;
  await act(async () => last.unmount());
  await evict();
  expect(disposed).toBeGreaterThan(0);
  await render("fresh", [url]);
  expect(requests.get(url)?.count).toBe(2);
  await finish(url);
  expect(results.fresh.get(url)!.asset).not.toBe(asset);
});

test("changing a lineup ignores stale loads and isolates a missing model", async () => {
  const root = await render("scene", ["/stale-model.glb"]);
  await act(async () =>
    root.render(
      <Probe id="scene" urls={["/current-model.glb", "/missing-model.glb"]} />,
    ),
  );
  await evict();
  await finish("/stale-model.glb");
  expect(results.scene.has("/stale-model.glb")).toBe(false);
  expect(results.scene.get("/current-model.glb")?.asset).toBeUndefined();
  await finish("/current-model.glb");
  await finish("/missing-model.glb", 404);
  expect(results.scene.get("/current-model.glb")?.asset).toBeDefined();
  expect(results.scene.get("/missing-model.glb")?.error).toBe(true);
  expect(results.scene.get("/current-model.glb")?.error).toBeUndefined();
});
