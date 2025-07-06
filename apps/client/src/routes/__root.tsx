import Header from "@/components/header";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/utils/supabase";
import { TRPCProvider } from "@/utils/trpc-provider";
import { userStore } from "@/utils/user-store";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { useEffect } from "react";
import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  beforeLoad: async () => {
    const setUser = userStore.getState().setUser;
    const logout = userStore.getState().logout;
    const user = userStore.getState().user;
    if (user) {
      return;
    }
    const session = await supabase.auth.getSession();
    if (session.data.session?.user) {
      const user = session.data.session.user;
      setUser({
        id: user.id,
        email: user.email,
        access_token: session.data.session.access_token,
      });
    } else {
      logout();
    }
  },
});
function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });
  const { setUser, user } = userStore();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !user) {
        const user = session.user;
        setUser({
          id: user.id,
          email: user.email,
          access_token: session.access_token,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [user]);

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
