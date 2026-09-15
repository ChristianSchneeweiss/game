import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
} from "@tanstack/react-router";
import { Crown, Mail, UserCircle } from "lucide-react";
import { HeaderFrame, GameToolbar } from "../src/components/header-frame";
import { SidebarProvider, SidebarInset } from "../src/components/ui/sidebar";
import { Button } from "../src/components/ui/button";
import { LibraryPage } from "../src/features/library/library-page";
import { parseLibrarySearch } from "../src/features/library/library-search";
import "../src/index.css";

function Preview() {
  const [search, setSearch] = useState(() => parseLibrarySearch({}));
  return (
    <SidebarProvider data-game-shell>
      <HeaderFrame>
        <Button asChild variant="outline" className="game-header-action">
          <Link to="/invitations" aria-label="Dungeon invitations">
            <Mail size={16} />
            <span className="game-header-action-label">Inbox</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="game-header-action">
          <Link to="/loot" aria-label="23 Loot" title="23 Loot">
            <Crown size={16} />
            <span className="game-header-action-label">Loot</span>
            <span className="game-header-action-count">23</span>
          </Link>
        </Button>
        <button type="button" aria-label="Preview account">
          <UserCircle size={28} />
        </button>
      </HeaderFrame>
      <SidebarInset>
        <GameToolbar />
        <LibraryPage search={search} onSearchChange={setSearch} />
        <p className="p-8 text-center text-sm text-[#b6ac99]">
          Development preview · sample account controls
        </p>
      </SidebarInset>
    </SidebarProvider>
  );
}

if (import.meta.env.DEV) {
  const rootRoute = createRootRoute({ component: Preview });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: "$" }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/library"] }),
  });
  const root = createRoot(document.getElementById("root")!);
  root.render(<RouterProvider router={router} />);
  import.meta.hot?.dispose(() => root.unmount());
}
