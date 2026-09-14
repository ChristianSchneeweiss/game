import Header from "@/components/header";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
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
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div data-game-shell className="relative min-h-screen overflow-x-clip">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-[radial-gradient(circle_at_top,rgba(244,180,86,0.08),transparent_48%)]"
          />
          <Header />
          {isFetching && <Loader />}
          <div data-game-content className="relative z-10">
            <Outlet />
          </div>
          <Toaster richColors />
        </div>
      </ThemeProvider>
      {import.meta.env.DEV && (
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" />
      )}
    </>
  );
}
