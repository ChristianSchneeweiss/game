import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { envSchema } from "./env";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";

export type Bindings = {
  GAME: KVNamespace;
  HYPERDRIVE: Hyperdrive;
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

export default {
  fetch: app.fetch,
  idleTimeout: 60,
};
