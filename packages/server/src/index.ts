import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";

type Bindings = {
  FOO: string;
};

const app = new Hono<{
  Bindings: Bindings;
}>();

app.use(logger());

app.use("/*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: ({ req }, c) => {
      return createContext({ req, env: c.env });
    },
  })
);

app.get("/healthCheck", (c) => {
  return c.text("OK");
});

export default app;
