import Header from "@/components/header";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { config } from "@/main";
import { TRPCProvider } from "@/utils/trpc-provider";
import { userStore } from "@/utils/user-store";
import { useUser } from "@clerk/clerk-react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import "../index.css";
import { WagmiProvider } from "wagmi";

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
    <WagmiProvider config={config}>
      <TRPCProvider>
        <RainbowKitProvider>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Header />
            {isFetching && <Loader />}
            <Outlet />
            <Toaster richColors />
          </ThemeProvider>
          {import.meta.env.DEV && (
            <ReactQueryDevtools
              position="bottom"
              buttonPosition="bottom-left"
            />
          )}
        </RainbowKitProvider>
      </TRPCProvider>
    </WagmiProvider>
  );
}
