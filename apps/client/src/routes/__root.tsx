import Header from "@/components/header";
import { GameToolbar } from "@/components/header-frame";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { PageError, PageNotFound } from "@/components/page-recovery";
import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  errorComponent: PageError,
  notFoundComponent: PageNotFound,
});
function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SidebarProvider data-game-shell>
        <Header />
        <SidebarInset>
          <GameToolbar />
          <div data-game-content className="relative z-10">
            {isFetching && <Loader />}
            <Outlet />
          </div>
        </SidebarInset>
        <Toaster richColors />
      </SidebarProvider>
    </ThemeProvider>
  );
}
