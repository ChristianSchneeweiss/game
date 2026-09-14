import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { Window as BrowserWindow } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import SuperJSON from "superjson";
import { MutationObserver, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRoute,
} from "@tanstack/react-router";
import type {} from "../../apps/client/src/main";
import type { PreparationData } from "../../apps/client/src/features/social/preparation-company";
import type {
  BattleMessage,
  ResponseMessage,
} from "../../apps/server/src/battle/protocol";

const browser = new BrowserWindow({
  url: "http://localhost:3001/dungeons/company/first",
});
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  location: browser.location,
  HTMLElement: browser.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});

let sockets: Socket[] = [];
class Socket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  static CLOSING = 2;
  readyState = 0;
  sent: string[] = [];
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (event: { data: string }) => void;
  onerror?: () => void;
  constructor(public url: string) {
    sockets.push(this);
  }
  send(message: string) {
    this.sent.push(message);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  acknowledge() {
    this.onmessage?.({ data: JSON.stringify({ type: "connected" }) });
  }
  receive(message: ResponseMessage) {
    this.onmessage?.({ data: SuperJSON.stringify(message) });
  }
}
Object.assign(globalThis, { WebSocket: Socket });
const { usePreparationPresence } =
  await import("../../apps/client/src/features/social/use-preparation-presence");
const { useBattleConnection } =
  await import("../../apps/client/src/routes/battle/-hooks/use-battle-connection");
const { userStore } = await import("../../apps/client/src/utils/user-store");
const { queryClient, trpc } = await import("../../apps/client/src/utils/trpc");
const { finishAccountAction } =
  await import("../../apps/client/src/features/social/social-queries");
const { PreparationCompany } =
  await import("../../apps/client/src/features/social/preparation-company");

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  sockets = [];
  userStore.getState().setUser({ id: "owner-a" });
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  userStore.getState().setUser(null);
  queryClient.clear();
});

function Attendance({ id }: { id?: string }) {
  const connected = usePreparationPresence(id);
  return <output>{connected ? "attending" : "disconnected"}</output>;
}

test("attendance requires server acknowledgement and ignores the previous dungeon's delayed socket callbacks", async () => {
  await act(async () => root.render(<Attendance id="first" />));
  const first = sockets[0]!;
  await act(async () => first.open());
  expect(host.textContent).toBe("disconnected");
  await act(async () => first.acknowledge());
  expect(host.textContent).toBe("attending");

  const oldMessage = first.onmessage!;
  const oldClose = first.onclose!;
  await act(async () => root.render(<Attendance id="second" />));
  expect(first.readyState).toBe(Socket.CLOSED);
  expect(host.textContent).toBe("disconnected");
  await act(async () =>
    oldMessage({ data: JSON.stringify({ type: "connected" }) }),
  );
  expect(host.textContent).toBe("disconnected");
  const second = sockets[1]!;
  expect(second.url).toContain("/preparation/second/presence");
  await act(async () => {
    second.open();
    second.acknowledge();
    oldClose();
  });
  expect(host.textContent).toBe("attending");
  expect(sockets).toHaveLength(2);
});

test("concurrent preparations have independent attendance and leaving one preserves the other", async () => {
  await act(async () =>
    root.render(
      <>
        <Attendance key="first" id="first" />
        <Attendance key="second" id="second" />
      </>,
    ),
  );
  const [first, second] = sockets;
  await act(async () => {
    first!.open();
    first!.acknowledge();
    second!.open();
    second!.acknowledge();
  });
  expect(host.textContent).toBe("attendingattending");
  await act(async () => root.render(<Attendance key="second" id="second" />));
  expect(first!.readyState).toBe(Socket.CLOSED);
  expect(second!.readyState).toBe(Socket.OPEN);
  expect(host.textContent).toBe("attending");
});

test("account changes discard private social state and old attendance cannot connect the new account", async () => {
  await act(async () => root.render(<Attendance id="first" />));
  const first = sockets[0]!;
  await act(async () => {
    first.open();
    first.acknowledge();
  });
  const keys: readonly (readonly unknown[])[] = [
    trpc.social.getFriends.queryKey(),
    trpc.social.getInvitations.queryKey(),
    trpc.preparation.list.queryKey(),
  ];
  for (const key of keys) queryClient.setQueryData(key, { private: "owner-a" });
  await act(async () => userStore.getState().setUser({ id: "owner-b" }));
  expect(first.readyState).toBe(Socket.CLOSED);
  expect(host.textContent).toBe("disconnected");
  for (const key of keys) expect(queryClient.getQueryData(key)).toBeUndefined();
  await act(async () => first.acknowledge());
  expect(host.textContent).toBe("disconnected");
  await act(async () => {
    sockets[1]!.open();
    sockets[1]!.acknowledge();
  });
  expect(host.textContent).toBe("attending");
});

test("disconnect invalidates attendance and reconnect waits for a fresh server acknowledgement", async () => {
  const schedule = globalThis.setTimeout;
  let reconnect: (() => void) | undefined;
  const timer = spyOn(globalThis, "setTimeout").mockImplementation(((
    callback: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ) => {
    const handle = schedule(callback, delay, ...args);
    if (delay === 2000) {
      clearTimeout(handle);
      reconnect = () => {
        if (typeof callback === "function") callback(...args);
      };
    }
    return handle;
  }) as typeof setTimeout);
  try {
    await act(async () => root.render(<Attendance id="first" />));
    await act(async () => {
      sockets[0]!.open();
      sockets[0]!.acknowledge();
    });
    await act(async () => sockets[0]!.close());
    expect(host.textContent).toBe("disconnected");
    expect(reconnect).toBeDefined();
    await act(async () => reconnect!());
    await act(async () => sockets[1]!.open());
    expect(host.textContent).toBe("disconnected");
    await act(async () => sockets[1]!.acknowledge());
    expect(host.textContent).toBe("attending");
  } finally {
    timer.mockRestore();
  }
});

test("returning to an earlier account still requires acknowledgement of its replacement connection", async () => {
  await act(async () => root.render(<Attendance id="first" />));
  await act(async () => {
    sockets[0]!.open();
    sockets[0]!.acknowledge();
  });
  expect(host.textContent).toBe("attending");
  await act(async () => userStore.getState().setUser({ id: "owner-b" }));
  expect(host.textContent).toBe("disconnected");
  await act(async () => userStore.getState().setUser({ id: "owner-a" }));
  expect(host.textContent).toBe("disconnected");
  expect(sockets[1]!.readyState).toBe(Socket.CLOSED);
  await act(async () => sockets[2]!.open());
  expect(host.textContent).toBe("disconnected");
  await act(async () => sockets[2]!.acknowledge());
  expect(host.textContent).toBe("attending");
});

test("terminal battle abandonment blocks commands, late snapshots and automatic reconnect", async () => {
  let connection!: ReturnType<typeof useBattleConnection>;
  function Battle() {
    connection = useBattleConnection("shared-battle");
    return (
      <output>
        {connection.abandoned ? `abandoned:${connection.abandoned}` : "live"}
      </output>
    );
  }
  await act(async () => root.render(<Battle />));
  const socket = sockets[0]!;
  const state: Extract<ResponseMessage, { type: "state" }> = {
    type: "state",
    data: {
      events: [],
      effectTracking: new Map(),
      round: { orderQueue: [], round: 1 },
      revision: 0,
      availableSpells: [],
    },
  };
  await act(async () => {
    socket.open();
    socket.receive(state);
  });
  expect(connection.synchronized).toBe(true);
  const command: BattleMessage = {
    type: "getTargets",
    data: {
      entityId: "hero",
      spellId: "spell",
      requestId: "first",
      revision: 0,
    },
  };
  expect(connection.send(command)).toBe(true);
  const events: string[] = [];
  const off = connection.events.on((event) => events.push(event.type));
  const retained = connection;
  await act(async () =>
    socket.receive({ type: "abandoned", data: { dungeonId: "ended-run" } }),
  );
  expect(host.textContent).toBe("abandoned:ended-run");
  expect(connection.synchronized).toBe(false);
  expect(events).toContain("reset");
  const sent = socket.sent.length;
  expect(retained.send(command)).toBe(false);
  retained.sendRead("late-read");
  await act(async () => {
    socket.receive(state);
    socket.receive({ type: "finished", data: { winner: "TEAM_A" } });
    socket.close();
    socket.open();
  });
  expect(connection.abandoned).toBe("ended-run");
  expect(connection.winner).toBeUndefined();
  expect(connection.synchronized).toBe(false);
  expect(socket.sent).toHaveLength(sent);
  expect(sockets).toHaveLength(1);
  off();
});

test("a mutation settling after an account switch cannot navigate the new account to the old private preparation", async () => {
  const history = createMemoryHistory({ initialEntries: ["/friends"] });
  const capturedAccount = userStore.getState().user!.id;
  let complete!: (id: string) => void;
  const response = new Promise<string>((resolve) => {
    complete = resolve;
  });
  let refreshes = 0;
  const mutation = new MutationObserver(queryClient, {
    mutationFn: () => response,
    onSuccess: (id: string) =>
      finishAccountAction(
        capturedAccount,
        async () => {
          refreshes++;
        },
        () => history.push(`/dungeons/company/${id}`),
      ),
  });
  const pending = mutation.mutate();
  userStore.getState().setUser({ id: "owner-b" });
  queryClient.setQueryData(["private-current-account"], "owner-b");
  complete("private-owner-a");
  await pending;
  expect(history.location.pathname).toBe("/friends");
  expect(refreshes).toBe(0);
  expect(queryClient.getQueryData<string>(["private-current-account"])).toBe(
    "owner-b",
  );
});

test("a switch during mutation refresh prevents navigation while same-account completion still proceeds", async () => {
  const history = createMemoryHistory({ initialEntries: ["/friends"] });
  let finishRefresh!: () => void;
  const refreshing = new Promise<void>((resolve) => {
    finishRefresh = resolve;
  });
  const pending = finishAccountAction(
    "owner-a",
    () => refreshing,
    () => history.push("/dungeons/company/private-owner-a"),
  );
  userStore.getState().setUser({ id: "owner-b" });
  finishRefresh();
  await pending;
  expect(history.location.pathname).toBe("/friends");
  await finishAccountAction(
    "owner-b",
    async () => undefined,
    () => history.push("/dungeons/company/owner-b"),
  );
  expect(history.location.pathname).toBe("/dungeons/company/owner-b");
});

function preparationFixture(): PreparationData {
  return {
    id: "first",
    key: "dungeon1",
    name: "Avalanche Lair",
    branching: true,
    revision: 7,
    hostUserId: "host",
    guestUserId: "owner-a",
    hostCharacterId: null,
    guestCharacterId: "owned-hero",
    hostReadyRevision: null,
    guestReadyRevision: null,
    dungeonId: null,
    replayOfDungeonId: null,
    createdAt: new Date("2026-09-14T00:00:00Z"),
    closedAt: null,
    canStart: false,
    participants: [
      {
        userId: "owner-a",
        username: "Guest",
        characterId: "owned-hero",
        characterName: "My adventurer",
        buildRevision: 3,
        isHost: false,
        connected: true,
        ready: false,
      },
    ],
  };
}

test("ready submits the preparation and owned build revisions displayed to the player", async () => {
  let receive!: (body: unknown) => void;
  const request = new Promise<unknown>((resolve) => {
    receive = resolve;
  });
  const fetch = spyOn(window as Window, "fetch").mockImplementation(
    async (_input, init) => {
      receive(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify([{ result: { data: SuperJSON.serialize(undefined) } }]),
        { headers: { "content-type": "application/json" } },
      );
    },
  );
  try {
    const preparation = preparationFixture();
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <PreparationCompany
            id={preparation.id}
            revision={preparation.revision}
            participants={preparation.participants}
            connected
          />
        </QueryClientProvider>,
      ),
    );
    const button = host.querySelector("button")!;
    expect(button.disabled).toBe(false);
    await act(async () => {
      button.click();
      await request;
    });
    const sent = (await request) as { "0": { json: unknown } };
    expect(sent["0"].json).toEqual({
      id: "first",
      ready: true,
      expectedRevision: 7,
      expectedBuildRevision: 3,
    });
  } finally {
    fetch.mockRestore();
  }
});

test("a forbidden preparation refetch removes stale controls and closes that run's attendance", async () => {
  const { Route } =
    await import("../../apps/client/src/routes/dungeons/company.$id");
  const base = createRootRoute({ component: Outlet });
  const route: AnyRoute = Route;
  Object.assign(route.options, {
    id: "/dungeons/company/$id",
    path: "/dungeons/company/$id",
    getParentRoute: () => base,
  });
  const router = createRouter({
    routeTree: base.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/dungeons/company/first"],
    }),
  });
  queryClient.setQueryDefaults(trpc.preparation.get.queryKey({ id: "first" }), {
    staleTime: Infinity,
  });
  queryClient.setQueryDefaults(trpc.character.getCharacters.queryKey(), {
    staleTime: Infinity,
  });
  queryClient.setQueryData(
    trpc.preparation.get.queryKey({ id: "first" }),
    preparationFixture(),
  );
  queryClient.setQueryData(trpc.character.getCharacters.queryKey(), []);
  const fetch = spyOn(window as Window, "fetch").mockImplementation(
    async () =>
      new Response(
        JSON.stringify([
          {
            error: SuperJSON.serialize({
              message: "Preparation membership ended",
              code: -32003,
              data: {
                code: "FORBIDDEN",
                httpStatus: 403,
                path: "preparation.get",
              },
            }),
          },
        ]),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
  );
  try {
    await router.load();
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      ),
    );
    expect(host.textContent).toContain("Choose your adventurer");
    const socket = sockets[0]!;
    await act(async () => socket.open());
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: trpc.preparation.get.queryKey({ id: "first" }),
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.textContent).toContain(
      "You are no longer part of this preparation",
    );
    expect(host.textContent).not.toContain("Choose your adventurer");
    expect(socket.readyState).toBe(Socket.CLOSED);
    expect(host.querySelector('a[href="/dungeons"]')).not.toBeNull();
  } finally {
    fetch.mockRestore();
  }
});
