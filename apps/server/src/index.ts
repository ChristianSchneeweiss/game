import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { BattleWebsocket } from "./battle-ws";
import { envSchema } from "./env";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";
export { BattleWebsocket } from "./battle-ws";

export type Bindings = {
  GAME: KVNamespace;
  HYPERDRIVE: Hyperdrive;
  BATTLE_WEBSOCKET: DurableObjectNamespace<BattleWebsocket>;
};

const app = new Hono<{
  Bindings: Bindings;
}>();

app.use(logger());

app.use("/*", cors());
app.use("*", clerkMiddleware());

app.use(
  "/trpc/*",
  trpcServer({
    // @ts-ignore
    router: appRouter,
    createContext: ({ req }, c) => {
      const auth = getAuth(c);

      return createContext({
        req,
        env: envSchema.parse(process.env),
        cfEnv: c.env,
        auth,
      });
    },
  })
);

app.get("/api/healthCheck", async (c) => {
  return c.text("OK");
});

app.get("/api/battle/:id", async (c) => {
  const battleId = c.req.param("id");

  const id = c.env.BATTLE_WEBSOCKET.idFromName(battleId);
  const stub = c.env.BATTLE_WEBSOCKET.get(id);

  const env = envSchema.parse(process.env);

  await stub.setup(
    c.env.HYPERDRIVE.connectionString,
    env.CLERK_SECRET_KEY,
    battleId
  );
  const userId = getAuth(c)?.userId;

  if (!userId) {
    return c.json({ error: "No user id" }, 401);
  }

  const url = new URL(c.req.raw.url);
  url.searchParams.set("userId", userId);

  return await stub.fetch(new Request(url.toString(), c.req.raw));
});

export default {
  fetch: app.fetch,
  idleTimeout: 60,
};
