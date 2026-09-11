import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { Window } from "happy-dom";
import { act, useEffect, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useQuery } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";

const browser = new Window({ url: "http://localhost:3001/items" });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  location: browser.location,
  HTMLElement: browser.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
let auth: {
  isLoaded: boolean;
  user: { id: string; primaryEmailAddress?: { emailAddress: string } } | null;
};
mock.module("@clerk/clerk-react", () => ({ useUser: () => auth }));
const { queryClient } = await import("../../apps/client/src/utils/trpc");
const { userStore } = await import("../../apps/client/src/utils/user-store");
const { TRPCProvider } = await import("../../apps/client/src/utils/trpc-provider");

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  auth = { isLoaded: true, user: { id: "owner-a" } };
  userStore.getState().setUser(null);
  queryClient.clear();
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  userStore.getState().setUser(null);
});
async function render(children: ReactNode) {
  await act(async () => root.render(<TRPCProvider>{children}</TRPCProvider>));
  // React Query batches observer notifications onto the next task.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

test("identity publication follows cache removal and same-user updates preserve queries", () => {
  userStore.getState().setUser({ id: "owner-a" });
  queryClient.setQueryData(["private"], "owner-a-data");
  userStore.getState().setUser({ id: "owner-a", email: "updated@example.test" });
  expect(queryClient.getQueryData<string>(["private"])).toBe("owner-a-data");
  const observed: unknown[] = [];
  const unsubscribe = userStore.subscribe(() => {
    observed.push(queryClient.getQueryData(["private"]));
  });
  userStore.getState().setUser({ id: "owner-b" });
  queryClient.setQueryData(["private"], "owner-b-data");
  userStore.getState().logout();
  unsubscribe();
  expect(observed).toEqual([undefined, undefined]);
  expect(userStore.getState().user).toBeNull();
});

test("mounted queries discard owner data on signout and account changes without resetting same-user views", async () => {
  let mounts = 0;
  const seen: { identity: string; value: string | undefined }[] = [];
  function Inventory() {
    const identity = auth.user?.id ?? "signed-out";
    const query = useQuery({
      queryKey: ["inventory"],
      queryFn: async () => `${identity}-inventory`,
      staleTime: Infinity,
    });
    useEffect(() => { mounts++; }, []);
    seen.push({ identity, value: query.data });
    return <output>{query.data ?? "loading"}</output>;
  }
  await render(<Inventory />);
  expect(host.textContent).toBe("owner-a-inventory");
  auth = { isLoaded: true, user: { id: "owner-a", primaryEmailAddress: { emailAddress: "new@example.test" } } };
  await render(<Inventory />);
  expect(mounts).toBe(1);
  expect(host.textContent).toBe("owner-a-inventory");

  auth = { isLoaded: true, user: null };
  await render(<Inventory />);
  expect(host.textContent).toBe("signed-out-inventory");
  expect(queryClient.getQueryData<string>(["inventory"])).toBe("signed-out-inventory");
  auth = { isLoaded: true, user: { id: "owner-b" } };
  await render(<Inventory />);
  expect(host.textContent).toBe("owner-b-inventory");
  expect(mounts).toBe(3);
  expect(seen.every(({ identity, value }) => !value || value === `${identity}-inventory`)).toBe(true);
});

test("an old identity's delayed response cannot populate the new mounted query or cache", async () => {
  let finishOld!: (value: string) => void;
  const oldResponse = new Promise<string>((resolve) => { finishOld = resolve; });
  function Inventory() {
    const identity = auth.user?.id ?? "signed-out";
    const query = useQuery({
      queryKey: ["inventory"],
      // Deliberately ignore cancellation, as an already-sent response can arrive late.
      queryFn: () => identity === "owner-a" ? oldResponse : Promise.resolve(`${identity}-inventory`),
      staleTime: Infinity,
    });
    return <output>{query.data ?? "loading"}</output>;
  }
  await render(<Inventory />);
  expect(host.textContent).toBe("loading");
  auth = { isLoaded: true, user: null };
  await render(<Inventory />);
  auth = { isLoaded: true, user: { id: "owner-b" } };
  await render(<Inventory />);
  await act(async () => finishOld("owner-a-private-inventory"));
  expect(host.textContent).toBe("owner-b-inventory");
  expect(queryClient.getQueryData<string>(["inventory"])).toBe("owner-b-inventory");
});

test("authentication stays synchronized on a route error screen and preserves the current URL", async () => {
  function Inventory() {
    const identity = auth.user?.id ?? "signed-out";
    const query = useQuery({
      queryKey: ["inventory"],
      queryFn: async () => {
        if (identity === "owner-a") throw new Error("synthetic access failure");
        return `${identity}-inventory`;
      },
      retry: false,
      throwOnError: true,
    });
    return <output>{query.data ?? "loading"}</output>;
  }
  const base = createRootRoute({
    component: Outlet,
    errorComponent: () => <output>Route unavailable</output>,
  });
  const items = createRoute({ getParentRoute: () => base, path: "/items", component: Inventory });
  const router = createRouter({
    routeTree: base.addChildren([items]),
    history: createMemoryHistory({ initialEntries: ["/items?tab=gear"] }),
  });
  const warn = spyOn(console, "warn").mockImplementation(() => undefined);
  const error = spyOn(console, "error").mockImplementation(() => undefined);
  try {
    await router.load();
    await render(<RouterProvider router={router} />);
    expect(host.textContent).toBe("Route unavailable");
    auth = { isLoaded: true, user: null };
    await render(<RouterProvider router={router} />);
    expect(userStore.getState().user).toBeNull();
    expect(host.textContent).toBe("signed-out-inventory");
    auth = { isLoaded: true, user: { id: "owner-b" } };
    await render(<RouterProvider router={router} />);
    expect(host.textContent).toBe("owner-b-inventory");
    expect(router.state.location.href).toBe("/items?tab=gear");
  } finally {
    warn.mockRestore();
    error.mockRestore();
  }
});

test("the initial Clerk handshake mounts no private queries before identity synchronization", async () => {
  let loads = 0;
  function Inventory() {
    const query = useQuery({
      queryKey: ["inventory"],
      queryFn: async () => { loads++; return userStore.getState().user?.id; },
    });
    return <output>{query.data}</output>;
  }
  auth = { isLoaded: false, user: null };
  await render(<Inventory />);
  expect(loads).toBe(0);
  auth = { isLoaded: true, user: { id: "owner-b" } };
  await render(<Inventory />);
  expect(loads).toBe(1);
  expect(host.textContent).toBe("owner-b");
});
