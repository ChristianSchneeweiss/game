import { expect, mock, test } from "bun:test";
import { retainedChatHistory } from "../../../apps/server/src/lib/chat-history";
import {
  socketLimits,
  SocketBudget,
} from "../../../apps/server/src/lib/socket-limits";

const clerkKeys: string[] = [];
mock.module("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}));
mock.module("@clerk/backend", () => ({
  createClerkClient: ({ secretKey }: { secretKey: string }) => {
    clerkKeys.push(secretKey);
    return { users: { getUser: async (id: string) => ({ id }) } };
  },
}));
const { BattleChat } =
  await import("../../../apps/server/src/durable-objects/battle-chat.do");

async function chatFixture(history: unknown = []) {
  const values = new Map<string, unknown>([
    ["clerkSecretKey", "old-synthetic-secret"],
    ["battleId", "synthetic-battle"],
    ["messages", history],
  ]);
  const received: string[] = [];
  const closed: number[] = [];
  const ws = {
    send: (message: string) => received.push(message),
    close: (code: number) => closed.push(code),
    deserializeAttachment: () => ({
      id: "synthetic-user",
      username: "synthetic",
    }),
  } as unknown as WebSocket;
  let writesFail = false;
  async function construct() {
    let initialize = Promise.resolve();
    const ctx = {
      storage: {
        get: async (key: string) => structuredClone(values.get(key)),
        put: async (key: string | Record<string, unknown>, value?: unknown) => {
          if (writesFail) throw new Error("synthetic storage failure");
          for (const [name, entry] of Object.entries(
            typeof key === "string" ? { [key]: value } : key,
          ))
            values.set(name, structuredClone(entry));
        },
      },
      getWebSockets: () => [ws],
      blockConcurrencyWhile: (fn: () => Promise<void>) => {
        initialize = fn();
        return initialize;
      },
    } as unknown as DurableObjectState;
    const chat = new BattleChat(ctx, {
      CLERK_SECRET_KEY: "new-synthetic-binding",
    } as Env);
    await initialize;
    return chat;
  }
  return {
    chat: await construct(),
    values,
    ws,
    received,
    closed,
    construct,
    failWrites: () => {
      writesFail = true;
    },
  };
}

test("chat rejects binary and oversized frames before writing, and repairs old malformed history", async () => {
  const f = await chatFixture([
    { user: "synthetic", message: new ArrayBuffer(8) },
    { user: "synthetic", message: "kept" },
  ]);
  expect(f.chat.messages).toEqual([{ user: "synthetic", message: "kept" }]);
  const before = structuredClone(f.chat.messages);
  await f.chat.webSocketMessage(f.ws, new ArrayBuffer(8));
  await f.chat.webSocketMessage(
    f.ws,
    "x".repeat(socketLimits.chatMessageBytes + 1),
  );
  expect(f.closed).toEqual([1003, 1009]);
  expect(f.values.get("messages")).toEqual(before);
  expect((await f.construct()).messages).toEqual(before);
});

test("chat uses runtime credentials and erases old persisted copies across setup and cold recovery", async () => {
  const f = await chatFixture();
  expect(f.values.get("clerkSecretKey")).toBeNull();
  await f.chat.setup("ignored-synthetic-secret", "synthetic-battle");
  expect(f.values.get("clerkSecretKey")).toBeNull();
  await f.construct();
  expect(clerkKeys.every((key) => key === "new-synthetic-binding")).toBe(true);
  await expect(f.chat.setup("other-battle")).rejects.toThrow("identity");
});

test("a failed chat write does not publish or mutate accepted history", async () => {
  const f = await chatFixture();
  f.failWrites();
  await expect(f.chat.webSocketMessage(f.ws, "not committed")).rejects.toThrow(
    "synthetic storage failure",
  );
  expect(f.chat.messages).toEqual([]);
  expect(f.received).toEqual([]);
});

test("retained history respects count and encoded storage budgets even with escaped control characters", () => {
  const records = Array.from({ length: 100 }, () => ({
    user: "synthetic",
    message: "\u0001".repeat(1024),
  }));
  const retained = retainedChatHistory(records);
  expect(retained.length).toBeGreaterThan(0);
  expect(retained.length).toBeLessThanOrEqual(socketLimits.chatHistory);
  expect(
    new TextEncoder().encode(JSON.stringify(retained)).byteLength,
  ).toBeLessThanOrEqual(socketLimits.chatHistoryBytes);
});

test("socket ingress budgets reject floods and release bookkeeping when closed", () => {
  const budget = new SocketBudget();
  const ws = {} as WebSocket;
  for (let n = 0; n < socketLimits.chatBurst; n++)
    expect(budget.take(ws, socketLimits.chatBurst, 0)).toBe(true);
  expect(budget.take(ws, socketLimits.chatBurst, 0)).toBe(false);
  expect(budget.take(ws, socketLimits.chatBurst, socketLimits.windowMs)).toBe(
    true,
  );
  budget.delete(ws);
  expect(budget.take(ws, socketLimits.chatBurst, socketLimits.windowMs)).toBe(
    true,
  );
});

test("socket budgets survive object hibernation using the authenticated attachment", () => {
  let attachment: unknown = { id: "owner", username: "synthetic" };
  const ws = {
    deserializeAttachment: () => attachment,
    serializeAttachment: (value: unknown) => {
      attachment = structuredClone(value);
    },
  } as WebSocket;
  for (let n = 0; n < socketLimits.chatBurst; n++)
    expect(new SocketBudget().take(ws, socketLimits.chatBurst, 0)).toBe(true);
  expect(new SocketBudget().take(ws, socketLimits.chatBurst, 0)).toBe(false);
  expect((attachment as { id: string }).id).toBe("owner");
});
