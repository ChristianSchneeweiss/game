import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { trpcServer } from "@hono/trpc-server";
import * as Sentry from "@sentry/cloudflare";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { TB_activeBattle, TB_user } from "./db/schema";
import { envSchema } from "./env";
import { createContext } from "./lib/context";
import { registerRecipes } from "./lib/superjson-recipes";
import { appRouter } from "./routers/index";
export { BattleChat } from "./durable-objects/battle-chat.do";
export { BattleWebsocket } from "./durable-objects/battle-ws";
export { BattleDoneWorkflow } from "./workflows/battle-done.workflow";

const app = new Hono<{
  Bindings: Env;
}>();

registerRecipes();

app.use(logger());

app.use("/*", cors());
app.use("*", clerkMiddleware());

app.onError((err, c) => {
  // Report _all_ unhandled errors.
  console.error(err, err.stack, err.cause);

  Sentry.captureException(err);
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: "Internal server error" }, 500);
});

// Bind global context via Hono middleware
app.use((c, next) => {
  const auth = getAuth(c);
  if (auth) {
    Sentry.setUser({
      email: auth.userId!,
    });
  }
  return next();
});

app.use(
  "/trpc/*",
  trpcServer({
    // @ts-ignore
    router: appRouter,
    onError: ({ error, ctx }) => {
      console.error(error);
      Sentry.captureException(error);
    },
    createContext: ({ req }, c) => {
      const auth = getAuth(c);

      return createContext({
        req,
        env: envSchema.parse(process.env),
        cfEnv: c.env,
        auth,
      });
    },
  }),
);

app.get("/api/healthCheck", async (c) => {
  return c.text("OK");
});

app.get("/api/battle/:id", async (c) => {
  const battleId = c.req.param("id");

  const id = c.env.BATTLE_WEBSOCKET.idFromName(battleId);
  const stub = c.env.BATTLE_WEBSOCKET.get(id);

  const env = envSchema.parse(process.env);

  const userId = getAuth(c)?.userId;

  if (!userId) {
    return c.json({ error: "No user id" }, 401);
  }

  await stub.setup(env.CLERK_SECRET_KEY, battleId);

  const url = new URL(c.req.raw.url);
  url.searchParams.set("userId", userId);

  return await stub.fetch(new Request(url.toString(), c.req.raw));
});

app.get("/api/battle/:id/chat", async (c) => {
  const battleId = c.req.param("id");

  const id = c.env.BATTLE_CHAT.idFromName(battleId);
  const stub = c.env.BATTLE_CHAT.get(id);

  const env = envSchema.parse(process.env);

  const userId = getAuth(c)?.userId;

  if (!userId) {
    return c.json({ error: "No user id" }, 401);
  }

  await stub.setup(env.CLERK_SECRET_KEY, battleId);
  const db = drizzle(c.env.DATABASE_URL);

  const [username] = await db
    .select({ username: TB_user.username })
    .from(TB_user)
    .where(eq(TB_user.id, userId));

  if (!username) {
    return c.json({ error: "No username" }, 401);
  }

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

export default Sentry.withSentry(
  (env) => ({
    dsn: "https://c460906fa7d1cb76b6ee238e4eed1d63@o4510053990334464.ingest.de.sentry.io/4510054011306064",

    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    // enabled: !!process.env.NODE_ENV && process.env.NODE_ENV !== "development",
    enabled: true,
  }),
  {
    fetch: app.fetch,
  } satisfies ExportedHandler<Env>,
);
