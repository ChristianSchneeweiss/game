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

app.use(
  "/trpc/*",
  trpcServer({
    // @ts-ignore
    router: appRouter,
    createContext: ({ req }, c) => {
      return createContext({
        req,
        env: envSchema.parse(process.env),
        cfEnv: c.env,
      });
    },
  })
);

app.get("/api/healthCheck", async (c) => {
  return c.text("OK");
});

app.get("/api/battle/:id", async (c) => {
  const battleId = c.req.param("id");
  const accessToken = c.req.query("access_token");

  if (!accessToken) {
    return c.json({ error: "No access token" }, 401);
  }

  const id = c.env.BATTLE_WEBSOCKET.idFromName(battleId);
  const stub = c.env.BATTLE_WEBSOCKET.get(id);

  const env = envSchema.parse(process.env);

  await stub.setup(
    c.env.HYPERDRIVE.connectionString,
    env.SUPABASE_URL,
    env.SUPABASE_KEY,
    battleId
  );

  return stub.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,
  idleTimeout: 60,
};
