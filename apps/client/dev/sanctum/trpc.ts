import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "../../../server/src/routers";
import { mutateFixture, queryFixture, scenario } from "./fixtures";
import { recordedResult } from "./transport";
import SuperJSON from "superjson";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    () =>
      ({ op }) =>
        observable((observer) => {
          if (scenario === "loading") return;
          const timer = setTimeout(
            () => {
              try {
                if (
                  scenario === "error" ||
                  (scenario === "mutation-error" && op.type === "mutation")
                )
                  throw new Error(
                    "Preview service unavailable. Please try again.",
                  );
                if (op.path === "getBattle" && op.input === "live")
                  throw new Error("Active battle has no recorded result.");
                const data =
                  op.path === "getBattle"
                    ? recordedResult
                    : op.type === "mutation"
                      ? mutateFixture(op.path, op.input)
                      : queryFixture(op.path, op.input);
                observer.next({
                  result: { data: SuperJSON.parse(SuperJSON.stringify(data)) },
                });
                observer.complete();
              } catch (error) {
                observer.error(TRPCClientError.from(error as Error));
              }
            },
            op.type === "mutation" ? 400 : 50,
          );
          return () => clearTimeout(timer);
        }),
  ],
});
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
