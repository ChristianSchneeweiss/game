import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";
import { SuperJSON } from "superjson";
import type { AppRouter } from "../../../server/src/routers";
import { userStore } from "./user-store";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/trpc",
      transformer: SuperJSON,
      fetch: async (url, options) => {
        const user = userStore.getState().user;
        if (user && options) {
          options.headers = {
            ...options.headers,
            authorization: `Bearer ${user.access_token}`,
          };
        }
        return fetch(url, options);
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
