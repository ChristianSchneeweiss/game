import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import {
  TB_activeBattle,
  TB_dungeonBattle,
  TB_spellStats,
  TB_user,
  type Database,
} from "../../../apps/server/src/db/schema";
import { redactTelemetry } from "../../../apps/server/src/lib/diagnostics";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
let activeDatabase: Database;
let probeOpens = 0;
let probeCloses = 0;
let probeOptions: unknown;
let probeEndOptions: unknown;
mock.module("postgres", () => ({
  default: (_url: string, options: unknown) => {
    probeOpens++;
    probeOptions = options;
    return {
      unsafe: async () => activeDatabase.execute(sql`select 1`),
      end: async (options: unknown) => {
        probeEndOptions = options;
        probeCloses++;
      },
    };
  },
}));
mock.module("cloudflare:workers", () => ({
  DurableObject: class {},
  WorkflowEntrypoint: class {},
  WorkflowStep: class {},
}));
mock.module("@clerk/backend", () => ({
  createClerkClient: () => ({
    users: {
      getUser: async (id: string) => ({
        id,
        emailAddresses: [{ emailAddress: "synthetic@example.invalid" }],
      }),
    },
  }),
}));
mock.module("@hono/clerk-auth", () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: (c: { req: { header: (name: string) => string | undefined } }) => ({
    userId: c.req.header("x-test-user") ?? null,
  }),
}));
mock.module("@sentry/cloudflare", () => ({
  withSentry: (_options: unknown, handler: unknown) => handler,
  captureException: () => undefined,
}));
mock.module("drizzle-orm/postgres-js", () => ({
  drizzle: () => activeDatabase,
}));
const { default: worker } = await import("../../../apps/server/src/index");
const { createContext } = await import("../../../apps/server/src/lib/context");

beforeEach(async () => {
  probeOpens = 0;
  probeCloses = 0;
  data = await database();
  activeDatabase = data.db;
  await data.db
    .insert(TB_dungeonBattle)
    .values({ dungeonId: "audit-dungeon", battleId: "audit-battle", round: 0 });
});
afterEach(async () => {
  await data.close();
});

function requestFixture() {
  const setups: unknown[][] = [];
  const stub = {
    setup: async (...args: unknown[]) => {
      setups.push(args);
    },
    fetch: async (request: Request) => {
      const url = new URL(request.url);
      return Response.json({
        userId: url.searchParams.get("userId"),
        username: url.searchParams.get("username"),
      });
    },
  };
  const namespace = { idFromName: (id: string) => id, get: () => stub };
  const env = {
    CLERK_SECRET_KEY: "synthetic-runtime-key",
    CLERK_PUBLISHABLE_KEY: "synthetic-public-key",
    DATABASE_URL: "in-memory-only",
    BATTLE_WEBSOCKET: namespace,
    BATTLE_CHAT: namespace,
  } as unknown as Env;
  const fetch = (path: string, headers: Record<string, string> = {}) =>
    worker.fetch!(
      new Request(`https://game.example${path}`, {
        headers: {
          Upgrade: "websocket",
          Origin: "https://game.example",
          "x-test-user": "audit-owner",
          ...headers,
        },
      }),
      env,
      {} as ExecutionContext,
    ) as Promise<Response>;
  return { setups, env, fetch };
}

test("public battle and chat routes overwrite forged identity using upstream authentication", async () => {
  const f = requestFixture();
  const battle = await f.fetch("/api/battle/audit-battle?userId=outsider");
  expect((await battle.json()) as unknown).toEqual({
    userId: "audit-owner",
    username: null,
  });
  const chat = await f.fetch(
    "/api/battle/audit-battle/chat?userId=outsider&username=forged",
  );
  expect((await chat.json()) as unknown).toEqual({
    userId: "audit-owner",
    username: "battle-tests",
  });
  expect(f.setups).toEqual([["audit-battle"], ["audit-battle"]]);
  expect(probeOpens).toBe(2);
  expect(probeCloses).toBe(probeOpens);
  expect(probeOptions).toEqual({
    max: 1,
    connect_timeout: 3,
    idle_timeout: 1,
    max_lifetime: 5,
  });
  expect(probeEndOptions).toEqual({ timeout: 1 });
});

test("anonymous, foreign-origin, non-upgrade and unknown-chat requests cannot create room activity", async () => {
  const f = requestFixture();
  expect(
    (await f.fetch("/api/battle/audit-battle", { "x-test-user": "" })).status,
  ).toBe(401);
  expect(
    (
      await f.fetch("/api/battle/audit-battle", {
        Origin: "https://outsider.example",
      })
    ).status,
  ).toBe(403);
  expect(
    (await f.fetch("/api/battle/audit-battle", { Upgrade: "" })).status,
  ).toBe(426);
  expect((await f.fetch("/api/battle/missing/chat")).status).toBe(404);
  expect((await f.fetch("/api/battle/missing")).status).toBe(404);
  expect(f.setups).toEqual([]);
  expect(await data.db.select().from(TB_activeBattle)).toEqual([]);
  expect(probeOpens).toBe(2);
  expect(probeCloses).toBe(probeOpens);
});

test("battle and chat handshakes close database clients when reads or activity writes fail", async () => {
  const f = requestFixture();
  activeDatabase = {
    select: () => {
      throw new Error("synthetic read failure");
    },
  } as unknown as Database;
  expect((await f.fetch("/api/battle/audit-battle")).status).toBe(500);
  expect((await f.fetch("/api/battle/audit-battle/chat")).status).toBe(500);
  expect(f.setups).toEqual([]);
  expect(probeOpens).toBe(2);
  expect(probeCloses).toBe(probeOpens);

  activeDatabase = data.db;
  await data.failWrites("active_battle");
  expect((await f.fetch("/api/battle/audit-battle/chat")).status).toBe(500);
  expect(probeOpens).toBe(3);
  expect(probeCloses).toBe(probeOpens);
});

test("the local Vite origin remains usable and oversized RPC bodies are rejected before dispatch", async () => {
  const f = requestFixture();
  const local = await worker.fetch!(
    new Request("http://localhost:3000/api/battle/audit-battle", {
      headers: {
        Upgrade: "websocket",
        Origin: "http://127.0.0.1:3001",
        "x-test-user": "audit-owner",
      },
    }),
    f.env,
    {} as ExecutionContext,
  );
  expect(local.status).toBe(200);
  const oversized = await worker.fetch!(
    new Request("https://game.example/trpc/createUser", {
      method: "POST",
      body: "x".repeat(65 * 1024),
      headers: {
        "x-test-user": "audit-owner",
        "content-type": "application/json",
        "content-length": String(65 * 1024),
      },
    }),
    f.env,
    {} as ExecutionContext,
  );
  expect(oversized.status).toBe(413);
});

test("readiness separates a running worker from missing bindings or an unavailable database", async () => {
  const f = requestFixture();
  expect((await f.fetch("/api/healthCheck")).status).toBe(200);
  expect((await f.fetch("/api/ready")).status).toBe(200);
  expect(probeCloses).toBe(1);
  expect(probeOptions).toEqual({
    max: 1,
    connect_timeout: 3,
    idle_timeout: 1,
    max_lifetime: 5,
  });
  const missingConfig = await worker.fetch!(
    new Request("https://game.example/api/ready"),
    {} as Env,
    {} as ExecutionContext,
  );
  expect(missingConfig.status).toBe(503);
  activeDatabase = {
    execute: async () => {
      throw new Error("synthetic database failure");
    },
  } as unknown as Database;
  const unavailable = await f.fetch("/api/ready");
  expect(unavailable.status).toBe(503);
  expect(probeCloses).toBe(2);
  expect(await unavailable.text()).toBe('{"ready":false}');
});

test("oversized streamed RPC bodies without a declared length fail before provisioning", async () => {
  const f = requestFixture();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(" ".repeat(65 * 1024)));
      controller.enqueue(new TextEncoder().encode("{}"));
      controller.close();
    },
  });
  const request = new Request("https://game.example/trpc/createUser", {
    method: "POST",
    body,
    headers: {
      "x-test-user": "streamed-new-user",
      "content-type": "application/json",
    },
  });
  expect(request.headers.has("content-length")).toBe(false);
  const response = await worker.fetch!(request, f.env, {} as ExecutionContext);
  expect(response.status).toBe(413);
  expect(
    await data.db
      .select()
      .from(TB_user)
      .where(eq(TB_user.id, "streamed-new-user")),
  ).toEqual([]);
});

test("first-request provisioning grants starter spells once and rolls back partial grants", async () => {
  const f = requestFixture();
  const provision = (userId: string) =>
    createContext({
      req: new Request("https://game.example/trpc"),
      cfEnv: f.env,
      env: f.env,
      auth: { userId } as Parameters<typeof createContext>[0]["auth"],
    });
  await Promise.all([provision("new-user"), provision("new-user")]);
  expect(
    await data.db
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.userId, "new-user")),
  ).toHaveLength(3);
  await data.db.execute(
    sql`CREATE FUNCTION reject_starter_grant() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'aqua-wave' THEN RAISE EXCEPTION 'synthetic starter grant failure'; END IF; RETURN NEW; END; $$`,
  );
  await data.db.execute(
    sql`CREATE TRIGGER reject_starter_grant BEFORE INSERT ON spell_stats FOR EACH ROW EXECUTE FUNCTION reject_starter_grant()`,
  );
  await expect(provision("failed-user")).rejects.toThrow();
  expect(
    await data.db.select().from(TB_user).where(eq(TB_user.id, "failed-user")),
  ).toEqual([]);
  expect(
    await data.db
      .select()
      .from(TB_spellStats)
      .where(eq(TB_spellStats.userId, "failed-user")),
  ).toEqual([]);
});

test("telemetry redaction removes synthetic credentials, chat, builds, query strings and error parameters", () => {
  const secret = "SYNTHETIC_CREDENTIAL_CONTENT";
  const safe = redactTelemetry({
    type: undefined,
    event_id: "safe-event",
    environment: "production",
    release: "safe-release",
    user: { email: secret },
    request: {
      url: `https://game.example/?token=${secret}`,
      headers: { Authorization: secret },
      data: secret,
    },
    message: secret,
    breadcrumbs: [{ message: secret }],
    extra: { sql: secret, build: secret, chat: secret },
    contexts: { arbitrary: { token: secret } },
    tags: { token: secret },
    exception: {
      values: [
        {
          type: "PostgresError",
          value: secret,
          stacktrace: {
            frames: [
              {
                filename: `https://game.example/assets/main.js?token=${secret}`,
                function: "onRequest",
                lineno: 42,
                vars: { token: secret },
                pre_context: [secret],
                post_context: [secret],
                context_line: secret,
              },
            ],
          },
        },
      ],
    },
  });
  expect(JSON.stringify(safe)).not.toContain(secret);
  expect(safe.exception!.values![0]!.stacktrace!.frames![0]).toEqual({
    filename: "main.js",
    function: "onRequest",
    lineno: 42,
    colno: undefined,
    in_app: undefined,
  });
  expect(safe.environment).toBe("production");
});
