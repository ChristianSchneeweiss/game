import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { trpcServer } from "@hono/trpc-server";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { Hono } from "hono";
import { cors } from "hono/cors";
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

export default {
  fetch: app.fetch,
  idleTimeout: 60,
};
