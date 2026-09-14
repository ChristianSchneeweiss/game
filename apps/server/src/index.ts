import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { trpcServer } from "@hono/trpc-server";
import * as Sentry from "@sentry/cloudflare";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import postgres from "postgres";
import { TRPCError } from "@trpc/server";
import {
  TB_activeBattle,
  TB_battleResult,
  TB_battleStart,
  TB_dungeonBattle,
  TB_user,
  type Database,
} from "./db/schema";
import { envSchema } from "./env";
import { createContext } from "./lib/context";
import { registerRecipes } from "./lib/superjson-recipes";
import { appRouter } from "./routers/index";
import { diagnostic, redactTelemetry } from "./lib/diagnostics";
import { getPreparation } from "./game-usecases/shared-preparation-read";
export { BattleChat } from "./durable-objects/battle-chat.do";
export { BattleWebsocket } from "./durable-objects/battle-ws";
export { BattleDoneWorkflow } from "./workflows/battle-done.workflow";
export { PreparationPresence } from "./durable-objects/preparation-presence";

const app = new Hono<{
  Bindings: Env;
}>();

function allowedOrigin(origin: string, requestUrl: string) {
  const request = new URL(requestUrl);
  if (origin === request.origin) return true;
  try {
    const candidate = new URL(origin);
    const local = (hostname: string) =>
      hostname === "localhost" || hostname === "127.0.0.1";
    return (
      local(request.hostname) &&
      local(candidate.hostname) &&
      candidate.protocol === "http:" &&
      ["3000", "3001"].includes(candidate.port)
    );
  } catch {
    return false;
  }
}

async function battleExists(battleId: string, db: Database) {
  const [attempt] = await db
    .select({ id: TB_dungeonBattle.battleId })
    .from(TB_dungeonBattle)
    .where(eq(TB_dungeonBattle.battleId, battleId))
    .limit(1);
  if (attempt) return true;
  const [start] = await db
    .select({ id: TB_battleStart.battleId })
    .from(TB_battleStart)
    .where(eq(TB_battleStart.battleId, battleId))
    .limit(1);
  if (start) return true;
  const [result] = await db
    .select({ id: TB_battleResult.battleId })
    .from(TB_battleResult)
    .where(eq(TB_battleResult.battleId, battleId))
    .limit(1);
  return Boolean(result);
}

async function withBattleDatabase<T>(
  databaseUrl: string,
  operation: (db: Database) => Promise<T>,
) {
  const client = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 3,
    idle_timeout: 1,
    max_lifetime: 5,
  });
  try {
    return await operation(drizzle(client));
  } finally {
    await client.end({ timeout: 1 });
  }
}

registerRecipes();

app.use(
  "/*",
  cors({
    origin: (origin, c) =>
      allowedOrigin(origin, c.req.url) ? origin : undefined,
  }),
);
app.use("/trpc/*", bodyLimit({ maxSize: 64 * 1024 }));
app.use("*", clerkMiddleware());

app.onError((err, c) => {
  diagnostic({
    event: "request.failed",
    version: c.env.CF_VERSION_METADATA?.id,
  });
  Sentry.captureException(err);
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: "Internal server error" }, 500);
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    onError: ({ error }) => {
      diagnostic({ event: "rpc.failed" });
      Sentry.captureException(error);
    },
    createContext: ({ req }, c) => {
      const auth = getAuth(c);

      return createContext({
        req,
        env: envSchema.parse(c.env),
        cfEnv: c.env,
        auth,
      });
    },
  }),
);

app.get("/api/healthCheck", async (c) => {
  return c.text("OK");
});

app.get("/api/ready", async (c) => {
  const config = envSchema.safeParse(c.env);
  if (!config.success) return c.json({ ready: false }, 503);
  let client: ReturnType<typeof postgres> | undefined;
  let ready = false;
  try {
    client = postgres(config.data.DATABASE_URL, {
      max: 1,
      connect_timeout: 3,
      idle_timeout: 1,
      max_lifetime: 5,
    });
    await client.unsafe("select 1");
    ready = true;
  } catch {
    ready = false;
  } finally {
    try {
      await client?.end({ timeout: 1 });
    } catch {
      ready = false;
    }
  }
  return c.json({ ready }, ready ? 200 : 503);
});

app.use("/api/battle/*", async (c, next) => {
  const origin = c.req.header("Origin");
  // The hosted app and development proxy both use same-origin WebSockets.
  if (origin && !allowedOrigin(origin, c.req.url))
    return c.json({ error: "Origin not allowed" }, 403);
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket")
    return c.json({ error: "WebSocket upgrade required" }, 426);
  return next();
});

app.get("/api/battle/:id", async (c) => {
  const battleId = c.req.param("id");

  const id = c.env.BATTLE_WEBSOCKET.idFromName(battleId);
  const stub = c.env.BATTLE_WEBSOCKET.get(id);

  const userId = getAuth(c)?.userId;

  if (!userId) {
    return c.json({ error: "No user id" }, 401);
  }

  envSchema.parse(c.env);
  return withBattleDatabase(c.env.DATABASE_URL, async (db) => {
    if (!(await battleExists(battleId, db)))
      return c.json({ error: "Battle not found" }, 404);
    await stub.setup(battleId);

    const url = new URL(c.req.raw.url);
    url.searchParams.set("userId", userId);

    return await stub.fetch(new Request(url.toString(), c.req.raw));
  });
});

app.get("/api/preparation/:id/presence", async (c) => {
  const origin = c.req.header("Origin");
  if (origin && !allowedOrigin(origin, c.req.url))
    return c.json({ error: "Origin not allowed" }, 403);
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket")
    return c.json({ error: "WebSocket upgrade required" }, 426);
  const userId = getAuth(c)?.userId;
  if (!userId) return c.json({ error: "No user id" }, 401);
  const preparationId = c.req.param("id");
  return withBattleDatabase(c.env.DATABASE_URL, async (db) => {
    try {
      const preparation = await getPreparation(preparationId, userId, db);
      if (preparation.closedAt) return c.json({ error: "Preparation closed" }, 409);
    } catch (error) {
      if (error instanceof TRPCError && error.code === "NOT_FOUND")
        return c.json({ error: "Preparation not found" }, 404);
      if (error instanceof TRPCError && error.code === "FORBIDDEN")
        return c.json({ error: "Preparation belongs to another party" }, 403);
      throw error;
    }
    const stub = c.env.PREPARATION_PRESENCE.get(
      c.env.PREPARATION_PRESENCE.idFromName(preparationId),
    );
    await stub.setup(preparationId);
    const url = new URL(c.req.raw.url);
    url.searchParams.set("userId", userId);
    return stub.fetch(new Request(url, c.req.raw));
  });
});

app.get("/api/battle/:id/chat", async (c) => {
  const battleId = c.req.param("id");

  const id = c.env.BATTLE_CHAT.idFromName(battleId);
  const stub = c.env.BATTLE_CHAT.get(id);

  const userId = getAuth(c)?.userId;

  if (!userId) {
    return c.json({ error: "No user id" }, 401);
  }

  envSchema.parse(c.env);
  return withBattleDatabase(c.env.DATABASE_URL, async (db) => {
    if (!(await battleExists(battleId, db)))
      return c.json({ error: "Battle not found" }, 404);

    const [username] = await db
      .select({ username: TB_user.username })
      .from(TB_user)
      .where(eq(TB_user.id, userId));

    if (!username) {
      return c.json({ error: "No username" }, 401);
    }

    await stub.setup(battleId);

    await db
      .insert(TB_activeBattle)
      .values({ battleId })
      .onConflictDoUpdate({
        target: TB_activeBattle.battleId,
        set: { lastAction: new Date() },
      });

    const url = new URL(c.req.raw.url);
    url.searchParams.set("userId", userId);
    url.searchParams.set("username", username.username);

    return await stub.fetch(new Request(url.toString(), c.req.raw));
  });
});

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: "https://c460906fa7d1cb76b6ee238e4eed1d63@o4510053990334464.ingest.de.sentry.io/4510054011306064",

    sendDefaultPii: false,
    enabled:
      env.DOPPLER_ENVIRONMENT === "production" ||
      env.DOPPLER_ENVIRONMENT === "staging",
    environment: env.DOPPLER_ENVIRONMENT,
    release: env.CF_VERSION_METADATA?.id,
    beforeSend: redactTelemetry,
  }),
  {
    fetch: app.fetch,
  } satisfies ExportedHandler<Env>,
);
