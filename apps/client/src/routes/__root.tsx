import Header from "@/components/header";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCProvider } from "@/utils/trpc-provider";
import { userStore } from "@/utils/user-store";
import { useUser } from "@clerk/clerk-react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
});
function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });
  const setUser = userStore((s) => s.setUser);
  const { user: clerkUser } = useUser();

  useEffect(() => {
    console.log("clerkUser", clerkUser);
    if (clerkUser) {
      setUser({
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0].emailAddress,
      });
    }
  }, [clerkUser]);

  return (
    <TRPCProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Header />
        {isFetching && <Loader />}
        <Outlet />
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </TRPCProvider>
  );
}
